import os, sys
from dotenv import load_dotenv
load_dotenv(r"d:\[Project]\SpeakFlow\backend\.env")

sys.path.append(r"d:\[Project]\SpeakFlow\backend")
from routers.pipeline import _process_audio
import base64
import tempfile
import traceback

wav_header = b"RIFF$\x00\x00\x00WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00D\xac\x00\x00\x88X\x01\x00\x02\x00\x10\x00data\x00\x00\x00\x00"

tmp_path = None
try:
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        tmp.write(wav_header)
        tmp_path = tmp.name
    print("Testing _process_audio...")
    signal_data = _process_audio(tmp_path, "Testing", 3)
    print("Success:", signal_data)
except Exception as e:
    traceback.print_exc()
finally:
    if tmp_path and os.path.exists(tmp_path):
        os.remove(tmp_path)
