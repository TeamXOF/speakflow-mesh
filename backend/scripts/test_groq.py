import os
import sys

# Add backend directory to sys.path so we can import app modules
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(current_dir)
sys.path.insert(0, backend_dir)

from app.services.stt.groq_whisper import groq_whisper, GroqSTTError

def main():
    test_audio_dir = os.path.join(backend_dir, "test_audio")
    
    if not os.path.exists(test_audio_dir):
        print(f"Error: test_audio directory not found at {test_audio_dir}")
        sys.exit(1)
        
    wav_files = [f for f in os.listdir(test_audio_dir) if f.endswith(".wav")]
    
    if not wav_files:
        print(f"Error: No .wav files found in {test_audio_dir}")
        sys.exit(1)
        
    for wav_file in wav_files:
        wav_path = os.path.join(test_audio_dir, wav_file)
        print(f"\n--- Testing {wav_file} ---")
        
        try:
            with open(wav_path, "rb") as f:
                audio_bytes = f.read()
                
            print(f"Loaded {len(audio_bytes)} bytes. Calling Groq STT...")
            result = groq_whisper(audio_bytes)
            
            print(f"Transcript: {result.text}")
            print("Words array:")
            for i, w in enumerate(result.words):
                print(f"  [{i}] '{w.word}' | {w.start_ms}ms - {w.end_ms}ms")
                
            # Verify monotonically increasing
            is_monotonic = True
            for i in range(1, len(result.words)):
                if result.words[i].start_ms < result.words[i-1].end_ms:
                    is_monotonic = False
                    print(f"  WARNING: Word {i} starts before word {i-1} ends!")
                    
            if is_monotonic:
                print("  [OK] Timestamps are monotonically increasing.")
                
        except GroqSTTError as e:
            print(f"Groq STT failed: {e}")
        except Exception as e:
            print(f"Unexpected error: {e}")

if __name__ == "__main__":
    main()
