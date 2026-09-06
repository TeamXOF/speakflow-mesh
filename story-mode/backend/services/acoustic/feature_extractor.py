import io
import av
import librosa
import numpy as np
from typing import Optional
from app.services.acoustic.models import FeatureVector


def decode_audio(audio_bytes: bytes) -> tuple[np.ndarray, int]:
    """Decodes audio bytes (e.g. WebM/WAV/MP3) into a mono float32 NumPy array using PyAV."""
    container = av.open(io.BytesIO(audio_bytes))
    stream = next(s for s in container.streams if s.type == 'audio')

    frames = []
    for frame in container.decode(stream):
        arr = frame.to_ndarray().astype(np.float32)

        # Normalize int16 PCM to [-1.0, 1.0]
        if frame.format.name in ('s16', 's16p'):
            arr = arr / 32768.0

        # Convert to mono if multi-channel
        arr = np.mean(arr, axis=0) if arr.shape[0] > 1 else arr[0]
        frames.append(arr)

    y = np.concatenate(frames) if frames else np.array([], dtype=np.float32)
    return y, stream.rate


def _safe_mean(arr: np.ndarray) -> float:
    """Returns mean of array, filtering NaN/inf. Returns 0.0 on empty."""
    valid = arr[np.isfinite(arr)]
    return float(np.mean(valid)) if len(valid) > 0 else 0.0


def _safe_std(arr: np.ndarray) -> float:
    valid = arr[np.isfinite(arr)]
    return float(np.std(valid)) if len(valid) > 0 else 0.0


def extract_features(audio_input: bytes | np.ndarray, start_ms: int = 0, end_ms: Optional[int] = None, sr: Optional[int] = None) -> FeatureVector:
    """
    Extracts the COMPLETE set of acoustic features from an audio snippet using Librosa.
    Supports either raw bytes (auto-decoded) or pre-decoded numpy array for high performance.
    """
    if isinstance(audio_input, np.ndarray):
        y = audio_input
        sr = sr or 16000
    else:
        y, sr = decode_audio(audio_input)

    # Slice to word boundaries
    start_sample = int((start_ms / 1000.0) * sr)
    end_sample = int((end_ms / 1000.0) * sr) if end_ms else len(y)
    y_word = y[start_sample:end_sample]

    total_duration_s = len(y_word) / sr if sr > 0 else 0.0

    # ── Silence guard ──────────────────────────────────────────────────────────
    if len(y_word) < sr * 0.05:  # Less than 50ms of audio
        return FeatureVector()   # Return all-zero defaults

    # ─────────────────────────────────────────────────────────────────────────
    # 1. Pitch (F0) via YIN algorithm
    # ─────────────────────────────────────────────────────────────────────────
    f0 = librosa.yin(y_word, fmin=50, fmax=500, sr=sr)
    f0_valid = f0[(f0 > 0) & np.isfinite(f0)]
    pitch_mean = float(np.mean(f0_valid)) if len(f0_valid) > 0 else 0.0
    pitch_std = float(np.std(f0_valid)) if len(f0_valid) > 0 else 0.0

    # ─────────────────────────────────────────────────────────────────────────
    # 2. Formants (F1, F2) via LPC
    # ─────────────────────────────────────────────────────────────────────────
    f1_mean, f2_mean = 0.0, 0.0
    if not np.all(y_word == 0):
        try:
            order = 2 + int(sr / 1000)
            a = librosa.lpc(y_word, order=order)
            if not (np.any(np.isnan(a)) or np.any(np.isinf(a))):
                roots = np.roots(a)
                roots = roots[np.imag(roots) >= 0]
                angles = np.arctan2(np.imag(roots), np.real(roots))
                freqs = sorted(angles * (sr / (2 * np.pi)))
                valid_freqs = [f for f in freqs if 50 < f < sr / 2 - 50]
                f1_mean = float(valid_freqs[0]) if len(valid_freqs) > 0 else 0.0
                f2_mean = float(valid_freqs[1]) if len(valid_freqs) > 1 else 0.0
        except Exception:
            pass

    # ─────────────────────────────────────────────────────────────────────────
    # 3. Zero Crossing Rate
    # ─────────────────────────────────────────────────────────────────────────
    zcr = librosa.feature.zero_crossing_rate(y_word)[0]
    zcr_mean = _safe_mean(zcr)
    zcr_std = _safe_std(zcr)

    # ─────────────────────────────────────────────────────────────────────────
    # 4. RMS Energy (Spectral Energy)
    # ─────────────────────────────────────────────────────────────────────────
    rms = librosa.feature.rms(y=y_word)[0]
    energy_mean = _safe_mean(rms)
    energy_std = _safe_std(rms)

    # ─────────────────────────────────────────────────────────────────────────
    # 5. MFCCs — 13 Mel-frequency cepstral coefficients
    # The most important feature for pronunciation analysis.
    # Captures the full shape of the vocal tract (like a "fingerprint" of how
    # the mouth and tongue were shaped during each phoneme).
    # ─────────────────────────────────────────────────────────────────────────
    mfccs = librosa.feature.mfcc(y=y_word, sr=sr, n_mfcc=13)
    mfcc_mean = [_safe_mean(mfccs[i]) for i in range(13)]
    mfcc_std = [_safe_std(mfccs[i]) for i in range(13)]

    # ─────────────────────────────────────────────────────────────────────────
    # 6. Spectral Centroid — perceived "brightness"
    # High centroid = sharp, clear pronunciation; Low = muffled
    # ─────────────────────────────────────────────────────────────────────────
    spec_centroid = librosa.feature.spectral_centroid(y=y_word, sr=sr)[0]
    spectral_centroid_mean = _safe_mean(spec_centroid)

    # ─────────────────────────────────────────────────────────────────────────
    # 7. Spectral Rolloff — high frequency energy threshold
    # ─────────────────────────────────────────────────────────────────────────
    spec_rolloff = librosa.feature.spectral_rolloff(y=y_word, sr=sr)[0]
    spectral_rolloff_mean = _safe_mean(spec_rolloff)

    # ─────────────────────────────────────────────────────────────────────────
    # 8. Spectral Bandwidth — spread of spectral energy
    # ─────────────────────────────────────────────────────────────────────────
    spec_bandwidth = librosa.feature.spectral_bandwidth(y=y_word, sr=sr)[0]
    spectral_bandwidth_mean = _safe_mean(spec_bandwidth)

    # ─────────────────────────────────────────────────────────────────────────
    # 9. Spectral Flatness — detects mumbling (values near 1.0 = noise-like)
    # ─────────────────────────────────────────────────────────────────────────
    spec_flatness = librosa.feature.spectral_flatness(y=y_word)[0]
    spectral_flatness_mean = _safe_mean(spec_flatness)

    # ─────────────────────────────────────────────────────────────────────────
    # 10. Pause / Silence Ratio — fraction of frames below energy threshold
    # Useful for hesitation detection within a word (stuttering)
    # ─────────────────────────────────────────────────────────────────────────
    silence_threshold = 0.01
    silent_frames = np.sum(rms < silence_threshold)
    pause_ratio = float(silent_frames / len(rms)) if len(rms) > 0 else 0.0

    # ─────────────────────────────────────────────────────────────────────────
    # 11. Speaking Rate — approximate words per second for this segment
    # Uses voiced frames (non-silent, non-zero ZCR) as a proxy for active speech
    # ─────────────────────────────────────────────────────────────────────────
    voiced_frames = np.sum(rms >= silence_threshold)
    voiced_duration_s = (voiced_frames / len(rms)) * total_duration_s if len(rms) > 0 else 0.0
    # Speaking rate at word level = 1 word / voiced duration (this feature is
    # more meaningful when aggregated at the sentence level in sessions.py)
    speaking_rate = 1.0 / voiced_duration_s if voiced_duration_s > 0.01 else 0.0

    return FeatureVector(
        pitch_mean=pitch_mean,
        pitch_std=pitch_std,
        f1_mean=f1_mean,
        f2_mean=f2_mean,
        zcr_mean=zcr_mean,
        zcr_std=zcr_std,
        energy_mean=energy_mean,
        energy_std=energy_std,
        mfcc_mean=mfcc_mean,
        mfcc_std=mfcc_std,
        spectral_centroid_mean=spectral_centroid_mean,
        spectral_rolloff_mean=spectral_rolloff_mean,
        spectral_bandwidth_mean=spectral_bandwidth_mean,
        spectral_flatness_mean=spectral_flatness_mean,
        speaking_rate=speaking_rate,
        pause_ratio=pause_ratio
    )
