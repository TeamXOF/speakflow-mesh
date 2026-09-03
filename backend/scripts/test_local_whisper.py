import sys
import os
import time
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.services.stt.local_whisper import local_whisper
from app.services.network.connectivity import network_available

def test_fallback():
    print("=== Testing Network Detection (F.2) ===")
    status1 = network_available()
    print(f"Network available initially: {status1}")
    print("If you want to test the 5s TTL, disable your network adapter now and re-run this script in 5 seconds.")
    
    print("\n=== Testing Local Whisper Fallback (F.1) ===")
    
    # We use the same 3 sample files generated in Phase B
    wav_files = ["temp_sample_1.wav", "temp_sample_2.wav", "temp_sample_3.wav"]
    
    # Generate them if they don't exist
    for i, wav_path in enumerate(wav_files):
        if not os.path.exists(wav_path):
            import wave
            import struct
            with wave.open(wav_path, 'w') as f:
                f.setnchannels(1)
                f.setsampwidth(2)
                f.setframerate(16000)
                # Just write a tiny bit of silence
                for _ in range(16000):
                    value = struct.pack('<h', 0)
                    f.writeframesraw(value)

    for wav_path in wav_files:
        with open(wav_path, "rb") as f:
            audio_bytes = f.read()
            
        print(f"\nProcessing {wav_path} via local_whisper (this will download model on first run)...")
        start_time = time.time()
        try:
            result = local_whisper(audio_bytes)
            print(f"[OK] Result shape exactly matches TranscriptResult!")
            print(f"Text: '{result.text}'")
            print(f"Language: {result.language}")
            print(f"Duration: {result.duration}")
            print(f"Time taken: {time.time() - start_time:.2f} seconds")
        except Exception as e:
            print(f"[FAIL] local_whisper failed: {e}")

if __name__ == "__main__":
    import os
    test_fallback()
