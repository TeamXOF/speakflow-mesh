import sys
import os
import wave
import struct
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.services.llm.gemini_client import GeminiFeedbackClient
from app.services.llm.exceptions import GeminiUnavailableError

def create_dummy_wav(path: str):
    """Creates a very short dummy wav file."""
    with wave.open(path, 'w') as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(44100)
        # Just write a tiny bit of silence
        for _ in range(44100 // 10):
            value = struct.pack('<h', 0)
            f.writeframesraw(value)

def test_gemini_feedback():
    print("Initializing GeminiFeedbackClient (dev key)...")
    try:
        client = GeminiFeedbackClient()
    except GeminiUnavailableError as e:
        print(f"[FAIL] Initialization failed. Check API keys. Error: {e}")
        return

    print("\n--- Testing E.1 generate_feedback (Text-only) ---")
    mismatch_data_list = [
        {"word": "rabbit", "issue": "Child pronounced the 'r' like a 'w'. Pitch was normal, but formants suggest rounded lips."},
        {"word": "elephant", "issue": "Child skipped the middle syllable, saying 'el-fant'."},
        {"word": "umbrella", "issue": "Child said 'um-bwe-la', struggling with the 'r' and 'l' sounds."},
        {"word": "qaf", "language": "ur", "issue": "Child pronounced it like 'kaf' (k instead of deep q). Needs to come from deeper in the throat."},
        {"word": "sheen", "language": "ur", "issue": "Child pronounced it like 'seen' (s instead of sh)."}
    ]
    
    for i, data in enumerate(mismatch_data_list):
        try:
            feedback = client.generate_feedback(data)
            print(f"Sample {i+1} [OK] Feedback Generated:\n\"{feedback}\"\n")
            assert len(feedback) > 5, "Feedback string was empty or too short."
        except Exception as e:
            print(f"Sample {i+1} [FAIL] generate_feedback failed: {e}")

    print("\n--- Testing E.2 judge_hesitation (Multimodal) ---")
    wav_path = "temp_hesitation.wav"
    create_dummy_wav(wav_path)
    
    with open(wav_path, "rb") as f:
        audio_bytes = f.read()

    pause_contexts = [
        {"pause_duration_ms": 1200, "word_before": "the", "word_expected": "elephant"},
        {"pause_duration_ms": 600, "word_before": "I", "word_expected": "am", "note": "Child has a stuttering history."},
        {"pause_duration_ms": 2000, "word_before": "big", "word_expected": "hippopotamus"}
    ]

    for i, ctx in enumerate(pause_contexts):
        try:
            judgement = client.judge_hesitation(audio_bytes, ctx)
            print(f"Pause {i+1} [OK] Judgement: '{judgement}'")
            assert judgement in ["nervous", "not_knowing"], f"Invalid judgement: {judgement}"
        except Exception as e:
            print(f"Pause {i+1} [FAIL] judge_hesitation failed: {e}")
            
    if os.path.exists(wav_path):
        os.remove(wav_path)

    print("\n--- Testing E.4 Missing Key Exception Handling ---")
    import app.core.config
    old_key = app.core.config.settings.GEMINI_API_KEY
    app.core.config.settings.GEMINI_API_KEY = ""
    
    try:
        bad_client = GeminiFeedbackClient()
        print("[FAIL] Should have raised GeminiUnavailableError for missing key.")
    except GeminiUnavailableError as e:
        print(f"[OK] Caught expected exception for missing key: {e}")
    finally:
        app.core.config.settings.GEMINI_API_KEY = old_key

    print("\n[OK] Phase E Gemini tests complete.")

if __name__ == "__main__":
    test_gemini_feedback()
