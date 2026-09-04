import asyncio
import websockets
import json
import base64
from pathlib import Path

async def test_ws():
    uri = "ws://192.168.1.42:8000/ws/sessions/test1"
    
    # Use the silence sample
    backend_dir = Path(__file__).parent
    wav_path = backend_dir / "temp_sample_1.wav"
    
    if not wav_path.exists():
        import struct
        import wave
        with wave.open(str(wav_path), 'wb') as f:
            f.setnchannels(1)
            f.setsampwidth(2)
            f.setframerate(16000)
            for _ in range(16000):
                f.writeframesraw(struct.pack('<h', 0))
                
    with open(wav_path, "rb") as f:
        audio_b64 = base64.b64encode(f.read()).decode('utf-8')
        
    payload = {
        "audio": audio_b64,
        "expected_word": "rabbit"
    }
    
    print(f"Connecting to {uri}...")
    try:
        async with websockets.connect(uri) as websocket:
            print("Connected. Sending payload...")
            await websocket.send(json.dumps(payload))
            
            print("Waiting for Phase 1...")
            phase1 = await websocket.recv()
            print("Received Phase 1:", phase1)
            
            print("Waiting for Phase 2...")
            phase2 = await websocket.recv()
            print("Received Phase 2:", phase2)
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_ws())
