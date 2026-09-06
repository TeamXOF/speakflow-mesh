"""
Acoustic evidence + comparison/scoring engine (roadmap Features 1 & Part 2.1).

This module is the v2 replacement for "string-matching only": it combines
  - word alignment between the target sentence and the Whisper transcript,
  - Whisper word confidence,
  - per-word acoustic features (pitch stability, energy, ZCR, duration)
    extracted with librosa over the word's exact timespan,
into a composite 0-100 per-word score. The correct/wrong threshold is a
config knob (WORD_CORRECT_THRESHOLD), deliberately biased against false
positives per roadmap Part 2.1.
"""
import os
import re
import json
import logging

from core.config import settings
from services import dictionary as refdict

log = logging.getLogger("speakflow.acoustic")

_DATA = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")

with open(os.path.join(_DATA, "phoneme_confusions.json"), encoding="utf-8") as _f:
    CONFUSION_PAIRS = json.load(_f)

_WORD_RE = re.compile(r"[\w\u0600-\u06FF']+", re.UNICODE)


def tokenize(text: str) -> list:
    return _WORD_RE.findall(text or "")


def _norm(word: str) -> str:
    return re.sub(r"[.,!?؛،؟]", "", word.lower().strip())


# Common English inflection endings — a child reading "jump" for "jumped" or
# "sleep" for "sleeping" made a real reading error (skipped the ending) and the
# assessment must say so instead of calling it a generic mispronunciation.
_EN_ENDINGS = ("'s", "s", "es", "ed", "d", "ing", "n", "ning")


def _morphology_error(target: str, spoken: str):
    """Detect a missing/added inflection ending between the printed word and
    what was actually said. Returns (kind, suffix) or None. Latin-suffix based,
    so it is naturally a no-op for Urdu."""
    t, s = _norm(target), _norm(spoken)
    if not t or not s or t == s:
        return None
    if t.startswith(s):
        # printed word carries the ending the child did not say
        rest = t[len(s):]
        if rest in _EN_ENDINGS and len(s) >= 3:
            return ("missing", rest)
    if s.startswith(t):
        # child said an ending that is not printed
        rest = s[len(t):]
        if rest in _EN_ENDINGS and len(t) >= 3:
            return ("added", rest)
    return None


def align_words(target_text: str, spoken_words: list) -> list:
    """Align spoken words onto target words.
    Returns one entry per TARGET word:
      {target, spoken, matched, probability, extra_after}
    `extra_after` counts spoken words inserted right after this target word
    (stutters/repeats), which feed hesitation analysis.
    """
    import difflib
    targets = tokenize(target_text)
    spoken = [(w["word"], w) for w in spoken_words]
    s_words = [_norm(w) for w, _ in spoken]
    t_words = [_norm(t) for t in targets]

    matcher = difflib.SequenceMatcher(None, t_words, s_words, autojunk=False)
    entries = []
    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        pairs = min(i2 - i1, j2 - j1)
        for k in range(pairs):
            t_idx, s_idx = i1 + k, j1 + k
            _, meta = spoken[s_idx]
            if t_words[t_idx] == s_words[s_idx]:
                matched, morph = True, None
            else:
                # "sleep" for "sleeping" / "jump" for "jumped": a word-ending
                # error, not a random mismatch — keep it visible to the scorer
                morph = _morphology_error(targets[t_idx], spoken[s_idx][0])
                matched = morph is not None
            entries.append({
                "target": targets[t_idx],
                "spoken": spoken[s_idx][0],
                "matched": matched,
                "morphology": morph,
                "probability": float(meta.get("probability", 0.9)),
                "extra_after": 0,
                "spoken_meta": meta,
            })
        # Remaining targets with no spoken counterpart (skipped words)
        for ti in range(i1 + pairs, i2):
            entries.append({
                "target": targets[ti], "spoken": None, "matched": False,
                "morphology": None,
                "probability": 0.0, "extra_after": 0, "spoken_meta": None,
            })
        # Extra spoken words (stutters/insertions/ad-libbed words) attach to the
        # previous entry — their texts feed the scorer so inserted words count
        # as reading errors instead of disappearing
        extra_texts = [spoken[j1 + pairs + k][0] for k in range((j2 - j1) - pairs)]
        if extra_texts and entries:
            entries[-1]["extra_after"] += len(extra_texts)
            entries[-1].setdefault("extra_words", []).extend(extra_texts)
    return entries


def _guess_phoneme_mismatch(target: str, spoken: str, language: str):
    """Infer a phoneme confusion label (e.g. f_vs_v) from curated minimal-pair
    tables, or 'unclear' when we cannot name the confusion honestly."""
    if not target or not spoken:
        return None
    t, s = _norm(target), _norm(spoken)
    pairs = CONFUSION_PAIRS.get(language, []) + CONFUSION_PAIRS.get("common", [])
    for a, b in pairs:
        if (a in t and b in s) or (b in t and a in s):
            return f"{a}_vs_{b}"
    import difflib
    if difflib.SequenceMatcher(None, t, s).ratio() >= 0.6:
        return "unclear"
    return "unclear"


def _formants(seg, sr: int) -> dict:
    """F1/F2 formant estimate via LPC root-solving (standard rule: order ≈ 2 + sr/1000).
    Returns zeros when the segment is too short or solving fails — zeros are
    treated as 'no evidence' downstream, never as maximum disagreement."""
    out = {"f1": 0.0, "f2": 0.0}
    try:
        import numpy as np
        import librosa
        frame = int(sr * 0.025)
        if seg.size < frame:
            return out
        x = seg[:frame * ((seg.size // frame))]  # trim to whole frames
        x = np.append(x[0], x[1:] - 0.97 * x[:-1])  # pre-emphasis
        a = librosa.lpc(x.astype(np.float32), order=2 + sr // 1000)
        roots = np.roots(a)
        roots = [r for r in roots if np.imag(r) > 0.01]
        freqs = sorted((np.angle(r) * (sr / (2 * np.pi))).real for r in roots)
        band = [f for f in freqs if 150.0 < f < 4500.0]
        if band:
            out["f1"] = round(float(band[0]), 1)
        if len(band) > 1:
            out["f2"] = round(float(band[1]), 1)
    except Exception as e:
        log.debug("formant estimation failed: %s", e)
    return out


def extract_word_acoustics(audio_path: str, spoken_words: list) -> dict:
    """Per-word acoustic features via librosa, computed over each word's exact
    timespan. Pitch analysis runs ONCE over just the speech region (first word
    start → last word end + padding) instead of the whole clip, keeping the
    Phase-1 acoustic budget small on long recordings."""
    import numpy as np
    import librosa

    y, sr = librosa.load(audio_path, sr=16000, mono=True)
    total_dur = len(y) / sr

    # Pitch track once for the SPEECH REGION only (big speed win on long clips)
    pitch_variance = 0.0
    f0 = None
    frame_offset = 0
    if spoken_words:
        t0 = max(0.0, float(min(w["start"] for w in spoken_words)) - 0.25)
        t1 = min(total_dur, float(max(w["end"] for w in spoken_words)) + 0.25)
        if t1 > t0:
            i0, i1 = int(t0 * sr), int(t1 * sr)
            region = y[i0:i1]
            frame_offset = i0 // 512  # frames of `region` are offset in `y` time
            f0, voiced_flag, _ = librosa.pyin(
                region, fmin=librosa.note_to_hz("C2"), fmax=librosa.note_to_hz("C7"),
                frame_length=1024, sr=sr)
            valid_f0 = f0[voiced_flag] if (f0 is not None and voiced_flag is not None
                                           and voiced_flag.any()) else np.array([])
            pitch_variance = float(np.var(valid_f0)) if valid_f0.size else 0.0

    frame_rate = sr / 512  # librosa default hop
    feats = {}
    for w in spoken_words:
        start, end = float(w["start"]), max(float(w["end"]), float(w["start"]) + 0.01)
        i0, i1 = int(start * sr), min(int(end * sr), len(y))
        seg = y[i0:i1]
        if seg.size == 0:
            feats[(start, end)] = {"rms": 0.0, "zcr": 0.0, "pitch_std": 0.0,
                                   "f1": 0.0, "f2": 0.0}
            continue
        f0_seg = np.array([])
        if f0 is not None:
            fi0 = max(0, int(start * frame_rate) - frame_offset)
            fi1 = max(fi0 + 1, int(end * frame_rate) - frame_offset)
            f0_seg = f0[fi0:fi1]
            f0_seg = f0_seg[~np.isnan(f0_seg)] if f0_seg.size else np.array([])
        feats[(start, end)] = {
            "rms": float(np.sqrt(np.mean(seg ** 2))),
            "zcr": float(np.mean(librosa.feature.zero_crossing_rate(seg))) if seg.size > 64 else 0.0,
            "pitch_std": float(np.std(f0_seg)) if f0_seg.size else 0.0,
            **_formants(seg, sr),
        }
    return {
        "word_features": feats,
        "pitch_variance": pitch_variance,
        "total_duration": total_dur,
        "sample_rate": sr,
    }


def score_word(entry: dict, acoustics: dict) -> dict:
    """Composite 0-100 per-word score: alignment (dominant) + Whisper confidence
    + a mild duration/plausibility nudge. Deliberately conservative about
    calling a word WRONG when it matched (anti false-positive bias)."""
    target = entry["target"]
    meta = entry.get("spoken_meta") or {}
    wf = acoustics["word_features"]

    if not entry["matched"]:
        # Wrong word or skipped word
        score = 20
        mismatch = _guess_phoneme_mismatch(target, entry.get("spoken") or "", entry.get("language", "en")) \
            if entry.get("spoken") else None
        return {
            "word": target or (entry.get("spoken") or ""),
            "correct": False,
            "score": score,
            "phoneme_mismatch": mismatch,
            "spoken": entry.get("spoken") or "",
        }

    prob = entry["probability"] if entry["probability"] > 0 else 0.85

    # Word-ending errors (missing/added -ed, -ing, -s…): below the pass bar,
    # with an honest label the child can act on
    morph = entry.get("morphology")
    if morph:
        kind, suf = morph
        return {
            "word": target,
            "correct": False,
            "score": 50,
            "phoneme_mismatch": f"missing -{suf}" if kind == "missing" else f"added -{suf}",
            "spoken": entry.get("spoken") or "",
        }

    score = 55 + 45 * prob

    key = (float(meta.get("start", 0)), float(meta.get("end", 0)))
    f = wf.get(key) or {}
    # Mild acoustic nudge: unstable pitch inside the word (stumble) / silence
    if f.get("pitch_std", 0) > 120:
        score -= 8
    if 0 < f.get("rms", 1) < 0.005:
        score -= 15

    # Reference-vector blend (roadmap Phase D) — no-op without a dictionary entry
    score = refdict.blend_into_score(score, f, _norm(target), entry.get("language", "en"))

    score = int(round(max(0, min(100, score))))
    correct = score >= settings.WORD_CORRECT_THRESHOLD and prob >= 0.55
    mismatch = None
    if not correct:
        mismatch = _guess_phoneme_mismatch(
            target, entry.get("spoken") or "", entry.get("language", "en"))
    return {"word": target, "correct": bool(correct), "score": score,
            "phoneme_mismatch": mismatch, "spoken": entry.get("spoken") or ""}


def detect_hesitations(spoken_words: list) -> list:
    """Gaps > PAUSE_FLAG_MS between consecutive spoken words."""
    pauses = []
    for i in range(1, len(spoken_words)):
        gap_ms = (spoken_words[i]["start"] - spoken_words[i - 1]["end"]) * 1000
        if gap_ms > settings.PAUSE_FLAG_MS:
            pauses.append({
                "after_word": spoken_words[i - 1]["word"],
                "pause_ms": int(round(gap_ms)),
                "flagged_ambiguous": bool(gap_ms < settings.PAUSE_AMBIGUOUS_MS),
            })
    return pauses


def engagement_heuristic(pitch_variance: float, pauses: list, accuracy: float) -> str:
    """Screening flag only — never a diagnosis (roadmap Feature 5)."""
    long_pauses = [p for p in pauses if p["pause_ms"] >= settings.PAUSE_AMBIGUOUS_MS]
    if accuracy < 45 and len(long_pauses) >= 2:
        return "frustrated"
    if pitch_variance > 2500 and len(long_pauses) >= 1:
        return "anxious"
    if accuracy >= 85 and len(long_pauses) == 0:
        return "confident"
    return "unknown"


def stars_for(accuracy: float) -> int:
    if accuracy >= 95: return 3
    if accuracy >= 80: return 2
    if accuracy >= settings.CHECKPOINT_PASS_THRESHOLD: return 1
    return 0


def build_signal(target_text: str, transcript_result, acoustics: dict, language: str,
                 stt_ms: float, acoustic_ms: float, scoring_ms: float) -> dict:
    """Assemble the full Phase-1 payload from transcript + features + scoring."""
    entries = align_words(target_text, transcript_result.words)
    for e in entries:
        e["language"] = language

    words_scored = [score_word(e, acoustics) for e in entries if e["target"]]

    # Inserted words that were never printed (stutters, ad-libbed words like
    # saying "Jesus" mid-sentence) are real reading errors — penalize them
    extras_scored = []
    for e in entries:
        for w in e.get("extra_words") or []:
            extras_scored.append({
                "word": w, "correct": False, "score": 15,
                "phoneme_mismatch": "extra word", "spoken": w, "extra": True,
            })
    words_scored.extend(extras_scored)

    target_count = max(len(tokenize(target_text)), 1)
    correct_count = sum(1 for w in words_scored if w["correct"])
    accuracy = int(round(correct_count / (target_count + len(extras_scored)) * 100))

    pauses = detect_hesitations(transcript_result.words)
    wpm = 0.0
    if transcript_result.words:
        dur = acoustics["total_duration"] or (
            transcript_result.words[-1]["end"] - transcript_result.words[0]["start"])
        if dur > 0:
            wpm = round(len(transcript_result.words) / dur * 60, 1)

    return {
        "transcript": transcript_result.text,
        "words": words_scored,
        "wpm": wpm,
        "accuracy": accuracy,
        "passed": accuracy >= settings.CHECKPOINT_PASS_THRESHOLD,
        "stars": stars_for(accuracy),
        "hesitations": pauses,
        "pitch_variance": acoustics["pitch_variance"],
        "stt_source": transcript_result.source,
        "stt_fallback_reason": transcript_result.fallback_reason,
        "engagement_state": engagement_heuristic(
            acoustics["pitch_variance"], pauses, accuracy),
        "latency_ms": {
            "stt": int(stt_ms),
            "acoustic": int(acoustic_ms),
            "scoring": int(scoring_ms),
            "total_phase1": int(stt_ms + acoustic_ms + scoring_ms),
        },
    }
