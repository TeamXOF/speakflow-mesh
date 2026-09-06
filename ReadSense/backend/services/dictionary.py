"""
Reference Dictionary (roadmap Phase D / Prompt 4).

Static build-time artifact loaded at boot: word/language -> reference
FeatureVector. Manual overrides take precedence over the auto-generated
dictionary (which is intended to be produced by the PronouncUR-assisted
flow documented in scripts/build_dictionary.py).

The dictionary NEVER processes live audio — it is lookup-only.
"""
import json
import logging
import os
from functools import lru_cache

from core.config import settings

log = logging.getLogger("speakflow.dictionary")

_DATA = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")

# Feature fields shared between extracted acoustics and reference vectors,
# with rough normalization scales so each contributes comparably.
FEATURE_FIELDS = {
    "pitch_std": 25.0,   # Hz
    "rms": 0.02,         # linear energy
    "zcr": 0.03,         # 0-1 rate
    "f1": 250.0,         # Hz
    "f2": 500.0,         # Hz
}


@lru_cache(maxsize=1)
def _load_all():
    try:
        with open(os.path.join(_DATA, "phoneme_dictionary.json"), encoding="utf-8") as f:
            dictionary = json.load(f)
    except FileNotFoundError:
        log.warning("phoneme_dictionary.json missing — reference blending disabled")
        dictionary = {}
    try:
        with open(os.path.join(_DATA, "manual_overrides.json"), encoding="utf-8") as f:
            overrides = json.load(f)
    except FileNotFoundError:
        overrides = {}
    return dictionary, overrides


def lookup(word: str, language: str) -> dict | None:
    """Reference vector for a word, or None. Overrides win over generated."""
    if not word:
        return None
    dictionary, overrides = _load_all()
    lang_overrides = overrides.get(language, {})
    if word in lang_overrides:
        return lang_overrides[word]
    return (dictionary.get(language) or {}).get(word)


def reference_distance(features: dict, reference: dict) -> float:
    """0-100 score for how close extracted features are to a reference vector
    (100 = perfect). Features that are zero/missing are skipped — they carry
    no evidence rather than maximum disagreement."""
    if not reference:
        return 50.0
    penalties, used = 0.0, 0
    for field, scale in FEATURE_FIELDS.items():
        ref_val = reference.get(field)
        got_val = features.get(field)
        if ref_val is None or not got_val:
            continue
        deviation = abs(float(got_val) - float(ref_val)) / max(scale, 1e-6)
        penalties += min(deviation, 2.0)  # cap a single feature's damage
        used += 1
    if used == 0:
        return 50.0
    mean_dev = penalties / used
    return max(0.0, 100.0 * (1.0 - mean_dev / 2.0))


def blend_into_score(score: float, features: dict, word: str, language: str) -> float:
    """Blend the reference-vector distance into the heuristic composite score.
    No-ops when the feature is disabled or the word has no reference."""
    if not settings.USE_REFERENCE_VECTORS:
        return score
    reference = lookup(word, language)
    if not reference:
        return score
    ref_score = reference_distance(features, reference)
    w = settings.REFERENCE_BLEND_WEIGHT
    return score * (1.0 - w) + ref_score * w
