import requests
import json
import time
import io
import wave
import struct

BASE_URL = "http://localhost:8003/api/v1"

def create_valid_wav_bytes():
    # Create a simple 1 second silent wave file in memory
    buf = io.BytesIO()
    with wave.open(buf, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(16000)
        # 16000 frames of silence
        data = struct.pack('<h', 0) * 16000
        w.writeframes(data)
    return buf.getvalue()

def test_flow():
    print("1. Creating session...")
    res = requests.post(f"{BASE_URL}/sessions", json={
        "student_id": "stu_001",
        "story_id": "story_forest",
        "language": "en"
    })
    res.raise_for_status()
    session_data = res.json()
    session_id = session_data["session_id"]
    print(f"   Created Session: {session_id}")

    print("\n2. Getting student dashboard (before analyze)...")
    dash = requests.get(f"{BASE_URL}/students/stu_001/dashboard?range=all")
    dash.raise_for_status()
    print("   Dashboard: ", dash.json())
    
    print("\n3. Analyzing checkpoint (Phase 1)...")
    valid_wav = create_valid_wav_bytes()
    files = {"audio": ("sample.wav", valid_wav, "audio/wav")}
    data = {"checkpoint_id": "cp_1"}
    
    res = requests.post(f"{BASE_URL}/sessions/{session_id}/analyze", files=files, data=data)
    if res.status_code != 200:
        print(f"FAILED Phase 1: {res.text}")
    else:
        phase1 = res.json()
        print("   Phase 1 Response STT Source:", phase1.get("stt_source"))
        print("   Words returned:", len(phase1.get("words", [])))
    
    print("\n4. Fetching session summary...")
    summ = requests.get(f"{BASE_URL}/sessions/{session_id}")
    summ.raise_for_status()
    print("   Summary keys:", list(summ.json().keys()))

    print("\n5. Polling for Phase 2 feedback...")
    for i in range(5):
        time.sleep(1)
        res = requests.get(f"{BASE_URL}/sessions/{session_id}/feedback/cp_1")
        if res.status_code == 200:
            phase2 = res.json()
            print("   Phase 2 feedback text:", phase2.get("feedback_text"))
            break
        print("   Waiting...")
        
    print("\n6. Testing Edge Cases...")
    
    # Missing checkpoint_id
    print("   Missing checkpoint_id...")
    files = {"audio": ("sample.wav", valid_wav, "audio/wav")}
    res_err1 = requests.post(f"{BASE_URL}/sessions/{session_id}/analyze", files=files)
    print("   Code:", res_err1.status_code)
    print("   Response:", res_err1.json())
    assert "VALIDATION_ERROR" in res_err1.text, "Expected VALIDATION_ERROR"
    
    # Invalid session id
    print("   Non-existent session...")
    files = {"audio": ("sample.wav", valid_wav, "audio/wav")}
    data = {"checkpoint_id": "cp_1"}
    res_err2 = requests.post(f"{BASE_URL}/sessions/invalid_sess/analyze", files=files, data=data)
    print("   Code:", res_err2.status_code)
    print("   Response:", res_err2.json())
    assert "SESSION_NOT_FOUND" in res_err2.text, "Expected SESSION_NOT_FOUND"

    print("\nAll tests passed.")

if __name__ == "__main__":
    test_flow()
