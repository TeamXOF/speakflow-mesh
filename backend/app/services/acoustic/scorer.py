import math
from app.services.acoustic.models import FeatureVector

def _score_metric(val: float, ref: float, max_diff: float) -> float:
    """Scores a single metric from 0 to 1 based on its absolute difference from reference."""
    if ref == 0.0 and val == 0.0:
        return 1.0
        
    diff = abs(val - ref)
    # normalize difference
    norm_diff = diff / max_diff
    # score is 1.0 - norm_diff, clamped between 0 and 1
    return max(0.0, 1.0 - norm_diff)

def score_against_reference(feature_vector: FeatureVector, reference_vector: FeatureVector) -> float:
    """
    Compares extracted features against a reference and returns a 0-100 composite score.
    """
    # Max allowed differences before score becomes 0 for that metric.
    # These are heuristic values for the engine.
    PITCH_MAX_DIFF = 100.0   # Hz
    F1_MAX_DIFF = 300.0      # Hz
    F2_MAX_DIFF = 500.0      # Hz
    ZCR_MAX_DIFF = 0.2       # Rate
    ENERGY_MAX_DIFF = 0.1    # RMS energy
    
    pitch_score = _score_metric(feature_vector.pitch_mean, reference_vector.pitch_mean, PITCH_MAX_DIFF)
    f1_score = _score_metric(feature_vector.f1_mean, reference_vector.f1_mean, F1_MAX_DIFF)
    f2_score = _score_metric(feature_vector.f2_mean, reference_vector.f2_mean, F2_MAX_DIFF)
    zcr_score = _score_metric(feature_vector.zcr_mean, reference_vector.zcr_mean, ZCR_MAX_DIFF)
    energy_score = _score_metric(feature_vector.energy_mean, reference_vector.energy_mean, ENERGY_MAX_DIFF)
    
    # Equal weights (20% each)
    composite_score = (pitch_score + f1_score + f2_score + zcr_score + energy_score) / 5.0
    
    return round(composite_score * 100.0, 2)
