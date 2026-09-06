# SpeakFlow AI — Pipeline Architecture Explained

> **What this is:** A plain-language breakdown of exactly what SpeakFlow does, why we use Whisper + Librosa + Gemma together, and how data flows from microphone to diagnosis. Written for the team.
> Last updated: 2026-07-14

---

## 🎯 What SpeakFlow Is Actually Trying to Do

SpeakFlow is a **reading diagnostics tool for children**. When a child reads a sentence out loud, a teacher cannot listen to 30 kids at once and individually diagnose *why* each one is struggling. SpeakFlow solves this.

It does **three distinct things**:

### 1. Measure *How* They Read (Acoustic Analysis)

Not just *what* they said — but *how* they said it:
- **How fast?** (Words Per Minute)
- **Where did they pause?** (and for how long?)
- **Did their voice pitch spike?** (anxiety/frustration signal)
- **Did they repeat words or stumble?** (hesitation markers)

### 2. Diagnose *Why* They Struggle (5 Gemma Agents)

Five specialized AI agents receive that acoustic data and reason about it:

| Agent | Job |
|---|---|
| **Phonetic Diagnostician** | Which specific sounds/phonemes are hard? ("br" blends, "th" sounds) |
| **Difficulty Classifier** | Is the struggle phonetic, cognitive, fluency-based, or mixed? |
| **Engagement Monitor** | Is the child anxious, frustrated, or confident right now? |
| **Practice Generator** | Generate 5 personalized practice sentences targeting their weak spots |
| **Progress Tracker** | Compare today to past sessions — are they improving? |

### 3. Report to the Teacher

A clean dashboard showing: score, struggling words, emotional state, and what to practice next. Built for teachers who have no time to manually analyze each child.

---

## 📦 What the Libraries Actually Do

These are **not** just "audio to text" tools. They extract precise diagnostic measurements.

### `openai-whisper` — Word-Level Transcription with Timestamps

Whisper returns **timestamps for every single word**, not just the full transcript:

```python
result = whisper.transcribe("reading.wav")

# What you actually get back:
{
  "text": "The brave dog ran quickly",
  "segments": [
    {"word": "The",    "start": 0.00, "end": 0.18, "probability": 0.99},
    {"word": "brave",  "start": 0.18, "end": 0.52, "probability": 0.97},
    {"word": "dog",    "start": 0.52, "end": 0.73, "probability": 0.99},
    {"word": "ran",    "start": 1.20, "end": 1.45, "probability": 0.95},  # ← gap before 'ran' = pause!
    {"word": "quickly","start": 1.45, "end": 1.90, "probability": 0.91},
  ]
}
```

From this alone you can calculate:
- **WPM** — `(5 words ÷ 1.90 seconds) × 60 = 158 WPM`
- **Exact pause locations** — the gap between "dog" ending at 0.73s and "ran" starting at 1.20s = **470ms pause**
- **Word confidence** — low `probability` means the child mumbled or mispronounced that specific word

### `librosa` — Acoustic Signal Analysis

Whisper gives you the *linguistic* picture. Librosa gives you the *physical* sound picture:

```
What librosa measures:
├── Pitch (F0)        — Is the child's voice rising? Falling? (anxiety = rising pitch)
├── Pitch Variance    — How much does pitch fluctuate? (high variance = stress/nervousness)
├── Silence Intervals — Detect pauses whisper might miss (sub-200ms micro-hesitations)
└── Energy/Volume     — Is the child reading louder at certain words? (effort/struggle signal)
```

---

## 🔄 The Full Pipeline — Step by Step

Here is exactly what happens when a child reads a sentence:

```
Child speaks into mic
        ↓
   Browser captures audio (WebM blob via MediaRecorder API)
        ↓
   Frontend sends audio_base64 to FastAPI backend
        ↓
   ┌─── WHISPER ──────────────────────────────────────────┐
   │  Input:  raw audio file                               │
   │  Output: full transcript + word-level timestamps      │
   │          + confidence scores per word                 │
   └──────────────────────────────────────────────────────┘
        ↓
   ┌─── LIBROSA ──────────────────────────────────────────┐
   │  Input:  raw audio file                               │
   │  Output: pitch_variance, pause_durations              │
   │          silence_intervals, energy_curve              │
   └──────────────────────────────────────────────────────┘
        ↓
   Combine into structured signal_data dict:
   {
     "transcript": "The brave dog ran quickly",
     "wpm": 95,
     "pauses": [{"at": 0.73, "duration": 0.47}],
     "pitch_variance": 340.2,
     "hesitation_count": 2,
     "word_timings": [...],
     "grade": 3,
     "target_sentence": "The brave dog ran quickly through the dark forest."
   }
        ↓
   ┌─── 5 GEMMA AGENTS (run in parallel via asyncio) ─────┐
   │  All receive the structured signal_data dict          │
   │  Each reasons about it from their specialist angle    │
   │  All return clean JSON diagnosis                      │
   └──────────────────────────────────────────────────────┘
        ↓
   Dashboard renders:
   ├── Overall score (radial gauge)
   ├── Struggling phonemes ("br blend", "th")
   ├── Difficulty type (PHONETIC / FLUENCY / MIXED)
   ├── Emotional state (confident / slightly_anxious)
   ├── 5 personalized practice sentences
   └── Progress trend vs past sessions
```

---

## ✅ Why This Approach Is Better Than Feeding Raw Audio to Gemma

We tested feeding raw audio directly to `gemma-4-31b-it` and it returned:
```
400 Bad Request: Audio input modality is not enabled for this model
```

This is because the **31B Gemma model does not support audio**. Only the smaller E2B, E4B, and 12B variants do — and those are not available via the Google AI Studio API, only as local downloads.

### The Doctor Analogy

Imagine you're a specialist doctor (the Gemma agent). Would you rather:

- **Option A:** Receive a chart saying: *"Patient heart rate: 142bpm, blood pressure: 150/95, temperature: 38.5°C"* → You immediately reason and diagnose.
- **Option B:** Receive a raw EKG printout and be asked to extract all the numbers yourself before diagnosing.

**Whisper + Librosa are your lab instruments.** They produce precise measurements. **Gemma is the specialist doctor** who receives clean, structured data and makes an expert judgment.

The 31B Gemma model is optimized for **reasoning and language understanding**, not raw audio signal processing. Giving it pre-extracted acoustic features makes its 5 diagnoses **more accurate and more reliable** than raw audio would.

---

## 🧠 Gemma Model Clarification (Important)

The blueprint has a typo (`gemma-4-9b-it` — this model does not exist). Here is the correct model lineup:

| Model | Audio via API | Best For |
|---|---|---|
| `gemma-4-e2b-it` | ❌ Local only | Mobile/Edge |
| `gemma-4-e4b-it` | ❌ Local only | Mobile/Edge |
| `gemma-4-12b-it` | ❌ Local only | Audio (but no API) |
| `gemma-4-26b-it` (MoE) | ✅ AI Studio | Text reasoning |
| **`gemma-4-31b-it` (Dense)** | **✅ AI Studio** | **Text reasoning — this is our model** |

**Our architecture is correct:** use `gemma-4-31b-it` via the API for all 5 reasoning agents, and use Whisper+Librosa locally for audio preprocessing.

---

## 🔑 Key Takeaway

> SpeakFlow does not ask Gemma to *listen* to a child read.  
> It asks Gemma to *diagnose* a child's reading based on precise acoustic measurements.  
> Whisper and Librosa are the instruments. Gemma is the expert that interprets the results.

This separation is what makes the pipeline fast, reliable, and accurate — and it's exactly what the original blueprint intended.
