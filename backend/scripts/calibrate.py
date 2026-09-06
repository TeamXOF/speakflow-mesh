"""
Confusion-matrix calibration tool (roadmap Phase C verify / K.2).

Run correct and deliberately-wrong recordings of the demo sentences through
the real pipeline, then print a per-word confusion matrix and suggest whether
the current thresholds separate them.

Recording convention (place files in backend/test_audio/ — DOUBLE underscore):
  <story_id>__<checkpoint_id>.ok1.wav   (correct reads, any number of takes)
  <story_id>__<checkpoint_id>.ok2.wav
  <story_id>__<checkpoint_id>.bad1.wav  (deliberate mispronunciations)
  ...
WAV, MP3 and M4A are all accepted (ffmpeg handles the decoding).

Usage:
  python scripts/calibrate.py                    # all files in test_audio/
  python scripts/calibrate.py --language ur      # matrix over Urdu checkpoints
  python scripts/calibrate.py --word "fox" --language en --ref    # reference vector
  python scripts/calibrate.py --word "fox" --language en --ref --write
                                                 # ...and merge it into
                                                 # data/manual_overrides.json

--word/--ref convention: name each take after the word itself, e.g.
  fox__take1.wav  fox__take2.wav
The vector is extracted over the word's exact STT timespan using the SAME
per-word feature pipeline the runtime uses (services/acoustic.py), so the
numbers are directly comparable to what reference_distance() will see.
"""

import os
import sys
import json
import shutil
import argparse
from collections import defaultdict
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv  # noqa: E402
load_dotenv()

from services.stt import get_transcript  # noqa: E402
from services import acoustic  # noqa: E402
from core.config import settings  # noqa: E402

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AUDIO_DIR = Path(BACKEND_DIR) / "test_audio"
AUDIO_PATTERNS = ("*.wav", "*.mp3", "*.m4a")


def _all_recordings():
    # pathlib glob (not glob.glob): the project path may contain characters
    # like [ ] that glob would otherwise treat as a character class.
    files = []
    for pat in AUDIO_PATTERNS:
        files.extend(AUDIO_DIR.glob(pat))
    return sorted(files)


def score_file(path: str, target_text: str, language: str) -> list:
    result = get_transcript(path, language)
    ac = acoustic.extract_word_acoustics(path, result.words)
    entries = acoustic.align_words(target_text, result.words)
    for e in entries:
        e["language"] = language
    return [acoustic.score_word(e, ac) for e in entries if e["target"]]


def build_reference_vector(word: str, language: str) -> dict | None:
    """Mean per-word feature vector for `word`, extracted over the word's exact
    STT timespan with the same feature pipeline the runtime scores with."""
    import numpy as np

    norm = acoustic._norm(word)
    files = [f for f in _all_recordings() if word.lower() in os.path.basename(f).lower()]
    if not files:
        return None

    vecs = []
    for path in files:
        name = os.path.basename(path)
        result = get_transcript(path, language)
        ac = acoustic.extract_word_acoustics(path, result.words)
        feats = ac["word_features"]
        hits = [
            feats[(float(w["start"]), float(w["end"]))]
            for w in result.words
            if acoustic._norm(w["word"]) == norm
            and (float(w["start"]), float(w["end"])) in feats
        ]
        if not hits:
            print(f" {name}: word \"{word}\" not in transcript "
                  f"({acoustic._norm(' '.join(w['word'] for w in result.words))!r}) — skipped")
            continue
        for f in hits:
            vecs.append(f)
        print(f" {name}: {len(hits)} occurrence(s) used")

    if not vecs:
        return None
    mean_vec = {}
    for key in ("pitch_std", "rms", "zcr", "f1", "f2"):
        vals = [float(f.get(key, 0.0) or 0.0) for f in vecs]
        mean_vec[key] = round(float(np.mean(vals)), 2)
    return mean_vec


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--word", help="build a mean reference vector for one word")
    parser.add_argument("--language", default="en", choices=["en", "ur"])
    parser.add_argument("--ref", action="store_true", help="with --word: print JSON vector")
    parser.add_argument("--write", action="store_true",
                        help="with --ref: merge the vector into data/manual_overrides.json "
                             "(a timestamped backup is kept)")
    args = parser.parse_args()

    if args.word and args.ref:
        if not AUDIO_DIR.is_dir():
            print(f"Create {AUDIO_DIR} and record takes named "
                  f"<word>__take1.wav (e.g. fox__take1.wav)")
            sys.exit(1)
        mean_vec = build_reference_vector(args.word, args.language)
        if not mean_vec:
            print(f"No usable recordings of \"{args.word}\" in {AUDIO_DIR}.\n"
                  f"Name each take after the word, e.g. {args.word.lower()}__take1.wav")
            sys.exit(1)


        print(f'\nReference vector for "{args.word}" ({args.language}) '
              f"— per-word spans, runtime feature space:")
        print(json.dumps(mean_vec, indent=2))

        if args.write:
            overrides_path = os.path.join(BACKEND_DIR, "data", "manual_overrides.json")
            with open(overrides_path, encoding="utf-8") as f:
                overrides = json.load(f)
            overrides.setdefault(args.language, {})[acoustic._norm(args.word)] = mean_vec
            backup = overrides_path + ".bak"
            if not os.path.exists(backup):
                shutil.copy2(overrides_path, backup)
            with open(overrides_path, "w", encoding="utf-8") as f:
                json.dump(overrides, f, ensure_ascii=False, indent=2)
            print(f"Wrote into {overrides_path} "
                  f"(backup at {os.path.basename(backup)}). Restart the backend to reload.")
        else:
            print("Paste into data/manual_overrides.json (or re-run with --write to merge "
                  "automatically; use phoneme_dictionary.json only for bulk entries).")
        return

    # Full confusion matrix over test_audio/
    with open(os.path.join(BACKEND_DIR, "data", "stories.json"), encoding="utf-8") as f:
        stories = {s["id"]: s for s in json.load(f)["stories"]}

    if not os.path.isdir(AUDIO_DIR):
        print(f"Create {AUDIO_DIR} and record files named "
              f"<story_id>__<checkpoint_id>.ok1.wav / .bad1.wav")
        sys.exit(1)

    matrix = defaultdict(lambda: {"tp": 0, "fp": 0, "tn": 0, "fn": 0})
    files = _all_recordings()
    if not files:
        print(f"No recordings in {AUDIO_DIR}")
        sys.exit(1)

    text_key = "text_ur" if args.language == "ur" else "text_en"
    for path in files:
        name = os.path.splitext(os.path.basename(path))[0]
        try:
            # Naming convention: <story_id>__<checkpoint_id>.<ok|bad><take>.wav
            stem, kind = name.rsplit(".", 1)
            story_id, cp_id = stem.split("__")
        except ValueError:
            print(f" Skipping {name} — name must be <story_id>__<checkpoint_id>.ok1.wav")
            continue
        story = stories.get(story_id)
        if not story:
            print(f" Skipping {name} — unknown story {story_id}")
            continue
        cp = next((c for c in story["checkpoints"] if c["id"] == cp_id), None)
        if not cp:
            print(f" Skipping {name} — unknown checkpoint {cp_id}")
            continue
        target = cp[text_key]
        should_be_correct = kind.startswith("ok")
        words = score_file(path, target, args.language)
        for w in words:
            m = matrix[w["word"]]
            if should_be_correct and w["correct"]:
                m["tp"] += 1
            elif should_be_correct and not w["correct"]:
                m["fp"] += 1  # false positive: flagged though read correctly
            elif not should_be_correct and w["correct"]:
                m["fn"] += 1  # false negative: missed a real error
            else:
                m["tn"] += 1
        print(f" {name}: {'OK' if should_be_correct else 'BAD'} -> "
              f"{sum(1 for w in words if w['correct'])}/{len(words)} words correct")

    print("\n=== PER-WORD CONFUSION MATRIX ===")
    print(f"{'word':<14}{'ok->ok':>8}{'ok->wrong':>10}{'bad->ok':>9}{'bad->wrong':>11}")
    unstable = []
    for word, m in sorted(matrix.items()):
        print(f"{word:<14}{m['tp']:>8}{m['fp']:>10}{m['fn']:>9}{m['tn']:>11}")
        if m["fp"] > 0 or m["fn"] > 0:
            unstable.append(word)
    fp_total = sum(m["fp"] for m in matrix.values())
    fn_total = sum(m["fn"] for m in matrix.values())
    print(f"\nFalse positives (correct read flagged): {fp_total}")
    print(f"False negatives (mispronunciation missed): {fn_total}")
    print(f"Current WORD_CORRECT_THRESHOLD = {settings.WORD_CORRECT_THRESHOLD}")
    if unstable:
        print(f"Unstable words (consider dropping from the demo path per K.2): "
              f"{', '.join(sorted(set(unstable)))}")
    else:
        print("All words separate cleanly at the current threshold.")


if __name__ == "__main__":
    main()
