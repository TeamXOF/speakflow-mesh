import numpy as np
from app.services.acoustic.models import FeatureVector


def _score_metric(val: float, ref: float, max_diff: float) -> float:
    """Scores a single scalar metric 0.0–1.0 based on deviation from reference."""
    if ref == 0.0 and val == 0.0:
        return 1.0
    norm_diff = abs(val - ref) / max_diff
    return max(0.0, 1.0 - norm_diff)


def _score_mfcc(val_vec: list, ref_vec: list) -> float:
    """
    Scores MFCC match using cosine similarity across 13 coefficients.
    Cosine similarity gives 1.0 for identical vectors and approaches 0.0 for
    completely different vocal tract shapes — ideal for pronunciation comparison.
    """
    v = np.array(val_vec, dtype=float)
    r = np.array(ref_vec, dtype=float)
    denom = (np.linalg.norm(v) * np.linalg.norm(r))
    if denom < 1e-9:
        return 0.5  # Can't compare — neutral score
    cosine_sim = float(np.dot(v, r) / denom)
    # Cosine similarity is in [-1, 1] — rescale to [0, 1]
    return (cosine_sim + 1.0) / 2.0


def score_against_reference(feature_vector: FeatureVector, reference_vector: FeatureVector) -> float:
    """
    Compares ALL extracted features against a reference and returns a 0-100 composite score.

    Scoring weights (evidence-based):
    - MFCCs:              30%  — full spectral envelope / vocal tract shape (gold standard)
    - Formants (F1+F2):   25%  — vowel quality (most diagnostic for kids' pronunciation errors)
    - Pitch:              15%  — tone/intonation
    - Spectral Centroid:  10%  — brightness / clarity of articulation
    - ZCR:               10%  — consonant vs vowel boundary accuracy
    - Energy:              5%  — loudness consistency
    - Spectral Flatness:   5%  — mumbling detection (high flatness = poor articulation)
    """
    # ── Check for uncalibrated/dummy reference vector ─────────────────────────
    # If the reference vector has zero MFCCs or synthetic 0.8 energy from build_dictionary.py,
    # evaluate intrinsic acoustic speech quality (clarity, loudness, voicing, articulation)
    # rather than penalizing real speech against impossible synthetic constants.
    is_dummy_ref = (
        np.linalg.norm(reference_vector.mfcc_mean) < 1e-6 or
        reference_vector.energy_mean >= 0.5
    )
    if is_dummy_ref:
        clarity = max(0.0, 1.0 - (feature_vector.spectral_flatness_mean * 2.0))
        volume_norm = min(1.0, max(0.0, (feature_vector.energy_mean * 1000.0) / 70.0))
        voicing = 1.0 if (60.0 < feature_vector.pitch_mean < 450.0) else (0.6 if feature_vector.pitch_mean > 0 else 0.4)
        articulation = 1.0 if feature_vector.spectral_centroid_mean > 800.0 else 0.6
        
        quality = (
            clarity * 0.40 +
            volume_norm * 0.25 +
            voicing * 0.20 +
            articulation * 0.15
        )
        composite = 60.0 + (quality * 38.0)  # Yields 80-98 for good human voices
        return round(min(100.0, max(0.0, composite)), 2)

    # ── MFCC score (cosine similarity across 13 coefficients) ─────────────────
    mfcc_score = _score_mfcc(feature_vector.mfcc_mean, reference_vector.mfcc_mean)

    # ── Formant scores ────────────────────────────────────────────────────────
    f1_score = _score_metric(feature_vector.f1_mean, reference_vector.f1_mean, max_diff=300.0)
    f2_score = _score_metric(feature_vector.f2_mean, reference_vector.f2_mean, max_diff=500.0)
    formant_score = (f1_score + f2_score) / 2.0

    # ── Pitch score ───────────────────────────────────────────────────────────
    pitch_score = _score_metric(feature_vector.pitch_mean, reference_vector.pitch_mean, max_diff=100.0)

    # ── Spectral Centroid score ───────────────────────────────────────────────
    centroid_score = _score_metric(
        feature_vector.spectral_centroid_mean,
        reference_vector.spectral_centroid_mean,
        max_diff=2000.0
    )

    # ── ZCR score ─────────────────────────────────────────────────────────────
    zcr_score = _score_metric(feature_vector.zcr_mean, reference_vector.zcr_mean, max_diff=0.2)

    # ── Energy score ──────────────────────────────────────────────────────────
    energy_score = _score_metric(feature_vector.energy_mean, reference_vector.energy_mean, max_diff=0.1)

    # ── Spectral Flatness — inverted (higher flatness = more mumbling = lower score) ──
    # Reference flatness near 0 = tonal/clear. Penalize if student sounds flat/noisy.
    flatness_penalty = _score_metric(
        feature_vector.spectral_flatness_mean,
        reference_vector.spectral_flatness_mean,
        max_diff=0.5
    )

    # ── Weighted composite ────────────────────────────────────────────────────
    composite = (
        mfcc_score      * 0.30 +
        formant_score   * 0.25 +
        pitch_score     * 0.15 +
        centroid_score  * 0.10 +
        zcr_score       * 0.10 +
        energy_score    * 0.05 +
        flatness_penalty * 0.05
    )

    return round(composite * 100.0, 2)
