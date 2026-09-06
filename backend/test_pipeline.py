from dotenv import load_dotenv
load_dotenv()
from fastapi.testclient import TestClient
from main import app


client = TestClient(app)

def test_pipeline():
    print("Sending POST request to /pipeline/run...")
    response = client.post(
        "/pipeline/run",
        json={
            "student_id": "student-1",
            "target_sentence": "The brave driver drove through the cold dark street.",
            "mocked_signal_data": {
                "words_spoken": [
                    {"word": "The", "timing_ms": 200, "pitch_deviation": 0.1, "accuracy_flag": True},
                    {"word": "brave", "timing_ms": 400, "pitch_deviation": 0.2, "accuracy_flag": True},
                    {"word": "diver", "timing_ms": 800, "pitch_deviation": 0.8, "accuracy_flag": False}, # intentional misread
                ],
                "wpm": 68.5,
                "pause_count": 2,
                "repetition_count": 1,
                "pitch_variance": 0.4,
                "pause_durations": [850, 1200],
                "hesitation_markers": 2,
                "session_duration_seconds": 45,
                "accuracy_trend": "stable"
            }
        }
    )
    
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        print("\n--- PIPELINE SUCCESS ---")
        data = response.json()
        print("Session ID:", data.get("session_id"))
        
        diag = data.get("diagnosis", {})
        
        print("\n[Agent 1: Phonetic]")
        print(diag.get("phonetic"))
        
        print("\n[Agent 2: Difficulty]")
        print(diag.get("difficulty"))
        
        print("\n[Agent 3: Engagement]")
        print(diag.get("engagement"))
        
        print("\n[Agent 4: Practice Generator]")
        print(diag.get("practice"))
        
        print("\n[Agent 5: Progress Tracker]")
        print(diag.get("progress"))
        
    else:
        print("\n--- PIPELINE FAILED ---")
        print(response.text)

if __name__ == "__main__":
    test_pipeline()
