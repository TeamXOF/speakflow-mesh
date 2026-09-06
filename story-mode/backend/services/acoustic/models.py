from pydantic import BaseModel, Field
from typing import List


class FeatureVector(BaseModel):
    # ── Existing features ──────────────────────────────────────────────────────
    pitch_mean: float = Field(default=0.0, description="Mean fundamental frequency F0 (Hz)")
    pitch_std: float = Field(default=0.0, description="Std deviation of F0 — measures pitch variation/expressiveness")

    f1_mean: float = Field(default=0.0, description="First formant frequency F1 (Hz) — vowel height")
    f2_mean: float = Field(default=0.0, description="Second formant frequency F2 (Hz) — vowel frontness/backness")

    zcr_mean: float = Field(default=0.0, description="Mean zero-crossing rate — distinguishes voiced vs unvoiced sounds")
    zcr_std: float = Field(default=0.0, description="Std deviation of ZCR")

    energy_mean: float = Field(default=0.0, description="Mean RMS energy (loudness)")
    energy_std: float = Field(default=0.0, description="Std deviation of RMS energy — measures dynamics")

    # ── NEW: MFCCs (Mel-frequency cepstral coefficients) ──────────────────────
    # The gold-standard feature in speech recognition. Models the full spectral
    # envelope of the vocal tract in 13 coefficients the way the human ear hears.
    mfcc_mean: List[float] = Field(default_factory=lambda: [0.0] * 13, description="Mean of 13 MFCC coefficients")
    mfcc_std: List[float] = Field(default_factory=lambda: [0.0] * 13, description="Std deviation of 13 MFCC coefficients")

    # ── NEW: Spectral Features ─────────────────────────────────────────────────
    spectral_centroid_mean: float = Field(default=0.0, description="Mean spectral centroid (Hz) — perceived 'brightness' of sound")
    spectral_rolloff_mean: float = Field(default=0.0, description="Mean spectral rolloff (Hz) — frequency below which 85% of energy is")
    spectral_bandwidth_mean: float = Field(default=0.0, description="Mean spectral bandwidth (Hz) — spread of spectral energy")
    spectral_flatness_mean: float = Field(default=0.0, description="Mean spectral flatness — 0=tonal, 1=noise-like; detects mumbling")

    # ── NEW: Rhythm / Pacing ───────────────────────────────────────────────────
    speaking_rate: float = Field(default=0.0, description="Words per second in this audio segment")
    pause_ratio: float = Field(default=0.0, description="Fraction of total audio that is silence — detects hesitation")
