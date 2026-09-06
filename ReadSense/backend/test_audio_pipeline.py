"""
SpeakFlow — Standalone Audio Pipeline Test
==========================================
Tests the full pipeline with the real Recording.m4a file.
Run this from the backend/ directory:
  python test_audio_pipeline.py

Steps:
  1. Whisper transcribes the audio + extracts word timestamps
  2. Librosa extracts WPM, pauses, pitch variance
  3. All 5 Gemma agents run on the structured data
  4. Full JSON diagnosis is printed to console
"""

import asyncio
import json
import os
import sys

from dotenv import load_dotenv
load_dotenv()


# ─── STEP 1: Check dependencies ───────────────────────────────────────────────

def check_deps():
    missing = []
    for pkg in ["whisper", "librosa", "numpy"]:
        try:
            __import__(pkg)
        except ImportError:
            missing.append(pkg)
    if missing:
        print(f"\n❌ Missing packages: {missing}")
        print("   Run:  pip install openai-whisper librosa numpy")
        print("   Also: make sure ffmpeg is installed and on your PATH")
        sys.exit(1)
    print("✅ All dependencies found")


# ─── STEP 2: DSP — Whisper + Librosa ──────────────────────────────────────────

def process_audio(audio_path: str, target_sentence: str, grade: int = 3) -> dict:
    import whisper
    import librosa
    import numpy as np

    print(f"\n📁 Audio file: {audio_path}")
    print(f"   Size: {os.path.getsize(audio_path):,} bytes")

    # --- Whisper ---
    print("\n🎙  Running Whisper (tiny model)...")
    model = whisper.load_model("tiny")

    # word_timestamps=True gives us per-word timing
    result = model.transcribe(audio_path, word_timestamps=True, language="en")
    transcript = result["text"].strip()
    print(f"   Transcript: \"{transcript}\"")

    # Extract word-level data from segments
    words_spoken = []
    all_word_times = []
    for seg in result.get("segments", []):
        for w in seg.get("words", []):
            words_spoken.append({
                "word": w["word"].strip(),
                "start": round(w["start"], 3),
                "end":   round(w["end"],   3),
                "duration_ms": round((w["end"] - w["start"]) * 1000),
                "probability": round(w.get("probability", 1.0), 3),
            })
            all_word_times.append((w["start"], w["end"]))

    # Detect pauses > 400ms between words
    pauses = []
    for i in range(1, len(all_word_times)):
        gap = all_word_times[i][0] - all_word_times[i - 1][1]
        if gap > 0.4:
            pauses.append({
                "after_word": words_spoken[i - 1]["word"],
                "duration_ms": round(gap * 1000),
            })

    # WPM from whisper word count + total duration
    total_duration = result["segments"][-1]["end"] if result["segments"] else 1
    word_count = len(transcript.split())
    wpm = round((word_count / total_duration) * 60, 1) if total_duration > 0 else 0

    print(f"   Word count : {word_count}")
    print(f"   Duration   : {total_duration:.1f}s")
    print(f"   WPM        : {wpm}")
    print(f"   Pauses >400ms: {len(pauses)}")

    # --- Librosa ---
    print("\n🔊 Running Librosa acoustic analysis...")
    y, sr = librosa.load(audio_path, sr=None, mono=True)

    # Pitch (F0) via PYIN algorithm
    f0, voiced_flag, _ = librosa.pyin(
        y,
        fmin=librosa.note_to_hz("C2"),
        fmax=librosa.note_to_hz("C7"),
    )
    valid_f0 = f0[voiced_flag] if (f0 is not None and voiced_flag is not None and voiced_flag.any()) else np.array([0.0])
    pitch_variance = round(float(np.var(valid_f0)), 2)
    mean_pitch = round(float(np.mean(valid_f0)), 2)

    print(f"   Mean pitch     : {mean_pitch} Hz")
    print(f"   Pitch variance : {pitch_variance}")

    # Build final signal_data for the agents
    signal_data = {
        # Transcription
        "transcript":          transcript,
        "words_spoken":        words_spoken,

        # Fluency metrics
        "wpm":                 wpm,
        "pause_count":         len(pauses),
        "pauses":              pauses,
        "repetition_count":    0,   # Whisper tiny doesn't detect repeats easily
        "hesitation_count":    len(pauses),

        # Acoustic metrics (Librosa)
        "pitch_variance":      pitch_variance,
        "pitch_series":        valid_f0[:10].tolist(),
        "pause_durations":     [p["duration_ms"] for p in pauses],
        "session_duration_seconds": round(total_duration),
        "accuracy_trend":      "stable",

        # Context for agents
        "grade":               grade,
        "target_sentence":     target_sentence,
    }

    return signal_data


# ─── STEP 3: Run the 5 Gemma agents ────────────────────────────────────────────

async def run_agents(signal_data: dict) -> dict:
    # Import from the agents package
    sys.path.insert(0, os.path.dirname(__file__))
    from agents.orchestrator import run_pipeline

    print("\n🤖 Running 5 Gemma agents (this takes 10–30 seconds)...")
    print("   [Agent 1: Phonetic]  [Agent 2: Difficulty]  [Agent 3: Engagement] — parallel")
    print("   [Agent 4: Practice]  [Agent 5: Progress]    — parallel after agents 1-3")

    results = await run_pipeline(signal_data, session_history=[])
    return results


# ─── STEP 4: Pretty-print results ──────────────────────────────────────────────

def print_results(signal_data: dict, results: dict):
    print("\n" + "=" * 60)
    print("   SPEAKFLOW DIAGNOSIS RESULTS")
    print("=" * 60)

    print(f"\n📊 ACOUSTIC SUMMARY")
    print(f"   Transcript  : {signal_data['transcript'][:80]}...")
    print(f"   WPM         : {signal_data['wpm']}")
    print(f"   Pauses      : {signal_data['pause_count']}")
    print(f"   Pitch var   : {signal_data['pitch_variance']}")

    agents = [
        ("1. Phonetic Diagnostician", "phonetic"),
        ("2. Difficulty Classifier",  "difficulty"),
        ("3. Engagement Monitor",     "engagement"),
        ("4. Practice Generator",     "practice"),
        ("5. Progress Tracker",       "progress"),
    ]

    for label, key in agents:
        print(f"\n{'─'*50}")
        print(f"🧠 Agent {label}")
        data = results.get(key, {})
        if "error" in data:
            print(f"   ❌ ERROR: {data['error']}")
        else:
            print(json.dumps(data, indent=4, ensure_ascii=False))

    print("\n" + "=" * 60)

    # Quick pass/fail check
    errors = [k for k in ["phonetic","difficulty","engagement","practice","progress"] if "error" in results.get(k, {})]
    if errors:
        print(f"⚠️  {len(errors)} agent(s) failed: {errors}")
        print("   Check your GOOGLE_API_KEYS in backend/.env")
    else:
        print("✅ ALL 5 AGENTS SUCCEEDED — Pipeline is working!")
    print("=" * 60)


# ─── MAIN ──────────────────────────────────────────────────────────────────────

async def main():
    print("=" * 60)
    print("   SPEAKFLOW — AUDIO PIPELINE TEST")
    print("=" * 60)

    # Resolve audio file path (in project root, one level up from backend/)
    script_dir    = os.path.dirname(os.path.abspath(__file__))
    project_root  = os.path.dirname(script_dir)
    audio_path    = os.path.join(project_root, "Recording.m4a")

    if not os.path.exists(audio_path):
        print(f"\n❌ Audio file not found: {audio_path}")
        print("   Drop Recording.m4a in the project root folder.")
        sys.exit(1)

    target_sentence = "The brave driver drove through the cold dark street."
    grade           = 3

    # Run all steps
    check_deps()
    signal_data = process_audio(audio_path, target_sentence, grade)
    results     = await run_agents(signal_data)
    print_results(signal_data, results)


if __name__ == "__main__":
    asyncio.run(main())
