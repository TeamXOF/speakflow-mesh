import io
import librosa
import numpy as np
from typing import Optional
from app.services.acoustic.models import FeatureVector

def extract_features(audio_bytes: bytes, start_ms: int = 0, end_ms: Optional[int] = None) -> FeatureVector:
    """
    Extracts aggregated acoustic features from an audio snippet.
    Returns a FeatureVector containing mean/std values.
    """
    # Load audio using librosa
    y, sr = librosa.load(io.BytesIO(audio_bytes), sr=None)
    
    # Slice the audio if timestamps are provided
    start_sample = int((start_ms / 1000.0) * sr)
    end_sample = int((end_ms / 1000.0) * sr) if end_ms else len(y)
    y_word = y[start_sample:end_sample]
    
    if len(y_word) == 0:
        # Fallback for empty slice
        return FeatureVector(
            pitch_mean=0.0, pitch_std=0.0,
            f1_mean=0.0, f2_mean=0.0,
            zcr_mean=0.0, zcr_std=0.0,
            energy_mean=0.0, energy_std=0.0
        )

    # 1. Pitch (F0) contour using yin
    # Yin returns f0, voiced_flag, voiced_probs
    f0 = librosa.yin(y_word, fmin=50, fmax=500, sr=sr)
    # Filter out NaNs and 0s
    f0_valid = f0[f0 > 0]
    pitch_mean = float(np.mean(f0_valid)) if len(f0_valid) > 0 else 0.0
    pitch_std = float(np.std(f0_valid)) if len(f0_valid) > 0 else 0.0

    # 2. Formants (F1, F2) using LPC
    # A standard quick approximation: calculate LPC roots
    # We use a relatively small order for formants (e.g., 2 + sr/1000)
    order = 2 + int(sr / 1000)
    a = librosa.lpc(y_word, order=order)
    # Find roots of the polynomial
    roots = np.roots(a)
    roots = roots[np.imag(roots) >= 0] # Keep only roots with positive imaginary part
    
    # Get frequencies from roots
    angles = np.arctan2(np.imag(roots), np.real(roots))
    freqs = sorted(angles * (sr / (2 * np.pi)))
    
    # Remove freqs close to 0 or Nyquist
    valid_freqs = [f for f in freqs if 50 < f < sr/2 - 50]
    
    f1_mean = float(valid_freqs[0]) if len(valid_freqs) > 0 else 0.0
    f2_mean = float(valid_freqs[1]) if len(valid_freqs) > 1 else 0.0

    # 3. Zero Crossing Rate (ZCR)
    zcr = librosa.feature.zero_crossing_rate(y_word)[0]
    zcr_mean = float(np.mean(zcr))
    zcr_std = float(np.std(zcr))

    # 4. Spectral Energy (RMS)
    rms = librosa.feature.rms(y=y_word)[0]
    energy_mean = float(np.mean(rms))
    energy_std = float(np.std(rms))

    return FeatureVector(
        pitch_mean=pitch_mean,
        pitch_std=pitch_std,
        f1_mean=f1_mean,
        f2_mean=f2_mean,
        zcr_mean=zcr_mean,
        zcr_std=zcr_std,
        energy_mean=energy_mean,
        energy_std=energy_std
    )
