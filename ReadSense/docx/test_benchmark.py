import time, os, sys
from dotenv import load_dotenv
load_dotenv(r'd:\[Project]\SpeakFlow\backend\.env')
sys.path.append(r'd:\[Project]\SpeakFlow\backend')
from routers.pipeline import _process_audio

audio_path = r'd:\[Project]\SpeakFlow\Recording.m4a'
print("Loading model and starting DSP pipeline...")
start_time = time.time()
signal_data = _process_audio(audio_path, 'Testing', 3)
end_time = time.time()

print('\n--- RESULTS ---')
print(f'Total Processing Time: {end_time - start_time:.2f} seconds')
print(f'Words Spoken: {len(signal_data.get("words_spoken", []))}')
print(f'WPM: {signal_data.get("wpm", 0)}')
