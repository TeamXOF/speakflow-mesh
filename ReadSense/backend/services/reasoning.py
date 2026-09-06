"""
Reasoning layer (roadmap Feature 3): Gemini turns structured error data into
encouraging, age-appropriate feedback — plus the multimodal hesitation judgment.
Both have defined non-LLM fallbacks (template bank / heuristic), per roadmap
Part 2.5. Fallbacks degrade the feedback *language*, never the correctness
judgment itself.
"""
import os
import json
import base64
import logging
import asyncio

import google.generativeai as genai

from core.config import settings

log = logging.getLogger("speakflow.reasoning")

_DATA = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")

with open(os.path.join(_DATA, "feedback_templates.json"), encoding="utf-8") as _f:
    TEMPLATES = json.load(_f)

FEEDBACK_SYSTEM_PROMPT = """You are a warm, encouraging reading tutor for children aged 5-10.
You receive structured JSON about one sentence a child just read aloud: per-word
correctness, phoneme mismatch labels, WPM, pauses, accuracy, and engagement flags.

Return ONLY valid JSON (no markdown):
{
  "feedback_text": "1-3 short, kind, specific sentences for the CHILD. Praise what went well first. If a word was wrong, name it gently and give one concrete mouth/sound tip. Never use technical labels like 'phoneme mismatch'.",
  "comprehension_question": "One simple question about what the sentence MEANS (not about reading mechanics).",
  "practice_recommendation": "One short instruction for what to practice, naming the specific word or sound. null if the read was flawless.",
  "teacher_note": "One sentence for the teacher's dashboard, plain language."
}

If the child got everything right, celebrate briefly and make practice_recommendation an
advanced challenge (a tongue-twister using the sentence's sounds) instead of null.
Write ALL child-facing text in {language_name}."""


WORD_TIP_PROMPT = """You are a friendly reading coach for a 6-9 year-old child. One word
from their reading just tripped them up. Answer in {language_name}, warm and encouraging,
in at most 2 very short sentences a child can follow. Tell them how to say the word (where
to break it, what the tricky letter sounds like) and one concrete thing to try. Never use
technical labels or mention technology or scores.
Return ONLY valid JSON (no markdown):
{"tip": "...", "syllables": ["part1", "part2"]}"""


def split_syllables(word: str) -> list:
    """Crude vowel-group splitter for read-aloud hints ("morning" → mor/ning).
    Good enough for coaching hints; Gemini corrects it when online."""
    import re
    parts = re.findall(
        r"[^aeiouy]*[aeiouy]+(?:[^aeiouy]*(?=[^aeiouy][aeiouy])|[^aeiouy]*$)",
        (word or "").lower())
    return parts or [(word or "").lower()]


async def generate_word_tip(word: str, language: str = "en",
                            mismatch: str = "", spoken: str = "") -> dict:
    """A short per-word pronunciation tip. Gemini first (short timeout), then an
    honest local template so the tooltip always shows something useful offline."""
    payload = {"word": word, "child_said": spoken or "", "sound_confusion": mismatch or ""}
    try:
        prompt = WORD_TIP_PROMPT.replace(
            "{language_name}", _LANGUAGE_NAMES.get(language, "English"))
        data = await _call_gemini_json(prompt, payload, 6.0)
        tip = str(data.get("tip") or "").strip()
        syllables = [str(s).strip() for s in (data.get("syllables") or []) if str(s).strip()]
        if tip:
            return {"tip": tip, "syllables": syllables or split_syllables(word),
                    "source": "gemini"}
    except Exception as e:
        log.warning("word tip gemini failed: %s", e)

    syllables = split_syllables(word) if language == "en" else [word]
    if mismatch and "_vs_" in mismatch:
        a, b = mismatch.split("_vs_", 1)
        tip = f'Say it slow: {" – ".join(syllables)}. Watch the “{a}” sound — it can sneak in like “{b}”.'
    else:
        tip = f'Say it slow, piece by piece: {" – ".join(syllables)}.'
    return {"tip": tip, "syllables": syllables, "source": "template"}

_MIME_BY_EXT = {
    ".webm": "audio/webm", ".wav": "audio/wav", ".mp4": "audio/mp4",
    ".m4a": "audio/mp4", ".ogg": "audio/ogg", ".mp3": "audio/mpeg",
}

_LANGUAGE_NAMES = {"en": "English", "ur": "Urdu (اردو)"}

_MODEL_NOT_FOUND_MARKERS = ("not found", "is not supported", "unsupported",
                            "does not exist", "not available")


def _configure_key():
    keys_str = settings.active_gemini_key
    keys = [k.strip() for k in keys_str.split(",") if k.strip()]
    if keys:
        genai.configure(api_key=keys[0])
    return keys


# Ensure the reasoning layer has a key configured even if the Gen-1
# orchestrator module was never imported (e.g. v2-only usage).
_configure_key()


def _extract_json(text: str) -> dict:
    start = text.find("{")
    if start != -1:
        decoder = json.JSONDecoder()
        parsed, _ = decoder.raw_decode(text[start:])
        return parsed
    return json.loads(text)


async def _call_gemini_json(system_prompt: str, payload: dict, timeout_s: float) -> dict:
    """One Gemini JSON call with a soft timeout. Raises on failure/timeout so the
    caller can fall back (roadmap Part 2.5: never block past the timeout)."""
    def _generate(model_name):
        model = genai.GenerativeModel(
            model_name=model_name,
            system_instruction=system_prompt,
            generation_config={"response_mime_type": "application/json"},
        )
        return model.generate_content(json.dumps(payload))

    last_err = None
    for model_name in (settings.FEEDBACK_MODEL, settings.FEEDBACK_MODEL_FALLBACK):
        try:
            resp = await asyncio.wait_for(
                asyncio.to_thread(_generate, model_name), timeout=timeout_s)
            return _extract_json(resp.text)
        except Exception as e:
            last_err = e
            msg = str(e).lower()
            if any(m in msg for m in _MODEL_NOT_FOUND_MARKERS):
                log.warning("Model %s unavailable (%s); trying fallback alias.",
                            model_name, e)
                continue
            raise
    raise last_err if last_err else RuntimeError("gemini call failed")


def _pick_template(category: str, language: str, word: str = "", phoneme: str = "") -> dict:
    lang = TEMPLATES.get(language) or TEMPLATES["en"]
    tpl = lang.get(category) or lang["phoneme"]
    out = {}
    for key in ("feedback_text", "comprehension_question", "practice_recommendation",
                "teacher_note"):
        val = tpl.get(key)
        if isinstance(val, str):
            val = val.replace("{word}", word or "this word").replace(
                "{phoneme}", phoneme or "the sound")
        out[key] = val
    return out


def classify_category(signal: dict) -> str:
    if signal["accuracy"] >= 98:
        return "all_correct"
    if signal["hesitations"] and len(signal["hesitations"]) >= 3:
        return "hesitant"
    if signal["wpm"] and signal["wpm"] < 40:
        return "fluency"
    if any(w["phoneme_mismatch"] for w in signal["words"] if not w["correct"]):
        return "phoneme"
    if signal["accuracy"] >= 80:
        return "strong"
    return "phoneme"


async def generate_feedback(signal: dict, checkpoint_hint: dict) -> dict:
    """Phase-2 feedback. Tries Gemini; falls back to the template bank.
    Returns the Phase-2 payload dict (without phase/session fields)."""
    category = classify_category(signal)
    language = checkpoint_hint.get("language", "en")
    first_bad = next((w for w in signal["words"] if not w["correct"]), None)
    word = first_bad["word"] if first_bad else ""
    phoneme = (first_bad or {}).get("phoneme_mismatch") or ""

    payload = {
        "target_text": checkpoint_hint.get("target_text", ""),
        "comprehension_hint": checkpoint_hint.get("comprehension_hint", ""),
        "transcript": signal["transcript"],
        "words": [{"word": w["word"], "correct": w["correct"],
                   "phoneme_mismatch": w["phoneme_mismatch"]} for w in signal["words"]],
        "accuracy": signal["accuracy"],
        "wpm": signal["wpm"],
        "pauses": signal["hesitations"],
        "engagement_flag": signal.get("engagement_state", "unknown"),
    }

    try:
        prompt = FEEDBACK_SYSTEM_PROMPT.replace(
            "{language_name}", _LANGUAGE_NAMES.get(language, "English"))
        data = await _call_gemini_json(prompt, payload, settings.FEEDBACK_TIMEOUT_S)
        return {
            "feedback_text": str(data.get("feedback_text", "")).strip(),
            "comprehension_question": str(data.get("comprehension_question", "")).strip(),
            "practice_recommendation": (str(data.get("practice_recommendation")).strip()
                                        if data.get("practice_recommendation") else None),
            "teacher_note": str(data.get("teacher_note", "")).strip() or None,
            "feedback_source": "gemini",
        }
    except Exception as e:
        log.warning("gemini_fallback: %s", e)
        tpl = _pick_template(category, language, word, phoneme)
        if not tpl.get("comprehension_question"):
            tpl["comprehension_question"] = checkpoint_hint.get("comprehension_hint") or None
        if not tpl.get("practice_recommendation") and word:
            lang_fb = TEMPLATES.get(language) or TEMPLATES["en"]
            tpl["practice_recommendation"] = (lang_fb.get("practice_word_fmt",
                "Practice the word '{word}'.")).replace("{word}", word)
        tpl["feedback_source"] = "template_fallback"
        return tpl


async def judge_hesitation(audio_path: str, pause_context: dict) -> str:
    """Multimodal hesitation judgment on an ambiguous pause (roadmap Feature 3b).
    NOTE (privacy, roadmap Part 2.4): this is the ONE call that sends a short
    raw audio clip to Google's API. Falls back to a pure-timing heuristic."""
    def _generate():
        with open(audio_path, "rb") as fh:
            audio_bytes = fh.read()
        ext = os.path.splitext(audio_path)[1].lower()
        model = genai.GenerativeModel(model_name=settings.FEEDBACK_MODEL)
        prompt = (
            "A child paused while reading this sentence aloud. Listen to the moment "
            "around the pause and judge: are they nervous/hesitant (they know the "
            "word but stumbled), or do they not know the word? "
            f"Pause context: {json.dumps(pause_context)}. "
            "Answer with exactly one word: nervous or not_knowing"
        )
        resp = model.generate_content(
            [{"text": prompt},
             {"inline_data": {"mime_type": _MIME_BY_EXT.get(ext, "audio/webm"),
                              "data": base64.b64encode(audio_bytes).decode()}}])
        text = (resp.text or "").strip().lower()
        return "not_knowing" if "not_knowing" in text else ("nervous" if "nervous" in text else "")

    try:
        result = await asyncio.wait_for(asyncio.to_thread(_generate),
                                        timeout=settings.HESITATION_TIMEOUT_S)
        if result:
            return result
    except Exception as e:
        log.warning("hesitation_fallback: %s", e)
    # Heuristic fallback: longer pauses look more like not knowing the word
    pause_ms = pause_context.get("pause_ms", 0)
    return "not_knowing" if pause_ms >= 700 else "nervous"
