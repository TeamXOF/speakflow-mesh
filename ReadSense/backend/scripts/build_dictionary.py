"""
Build-time dictionary tool (roadmap Phase D / Prompt 4).

PronouncUR (https://github.com/...) generates first-pass Urdu G2P lexicon
entries; this script documents the conversion into SpeakFlow's reference
vector format and provides the recording workflow for hand-verified vectors.

It does NOT run at request time — the runtime only reads the two JSON files:
  data/phoneme_dictionary.json   (generated entries)
  data/manual_overrides.json     (native-speaker overrides, highest priority)

Reference vector format (all fields optional but more is better):
  { "pitch_std": <Hz>, "rms": <linear 0-1>, "zcr": <0-1>, "f1": <Hz>, "f2": <Hz> }

Workflow to produce a REAL vector for a word:
  1. Record a native speaker saying the word cleanly 3 times
     (save as test_audio/<word>.ref1.wav, .ref2.wav, .ref3.wav).
  2. Run:  python scripts/calibrate.py --word "<word>" --language en
     The calibrator extracts the mean feature vector across takes and prints
     the JSON block to paste into phoneme_dictionary.json (or
     manual_overrides.json for high-stakes Urdu pairs like ق/ک, ع, ح, خ).
  3. Re-run the calibrator's confusion matrix to confirm the new reference
     separates correct vs deliberately-wrong takes before demo day.
"""
import json
import sys

EXPECTED_SHAPE = {
    "en": {
        "<word>": {"pitch_std": 0.0, "rms": 0.0, "zcr": 0.0, "f1": 0.0, "f2": 0.0}
    },
    "ur": {
        "<urdu word>": {"pitch_std": 0.0, "rms": 0.0, "zcr": 0.0, "f1": 0.0, "f2": 0.0}
    },
}

if __name__ == "__main__":
    print(json.dumps(EXPECTED_SHAPE, indent=2, ensure_ascii=False))
    print(__doc__)
    sys.exit(0)
