# 🚀 SpeakFlow: The AI-Powered Diagnostic Reading Platform

**SpeakFlow** transforms any standard, low-cost school device into a world-class, 1-on-1 reading tutor. By combining hyper-optimized local acoustic processing with the deep reasoning capabilities of the **Gemma 3N Multi-Agent Orchestrator**, we instantly diagnose phonetic struggles, track emotional engagement, and dynamically generate targeted reading practice for elementary students.

---

## 🎥 5-Minute Demo Video
*(Insert your YouTube/Google Drive link here. **Judges: Please start here!**)*

## 📸 Platform Capabilities
*(Upload Screenshot 1 here: Show the Session Telemetry Card displaying WPM and Accuracy)*
**Figure 1:** Real-time acoustic telemetry extraction displaying Reading Rate (WPM) and phoneme-level accuracy.

*(Upload Screenshot 2 here: Show the Agents at Work Card)*
**Figure 2:** The Multi-Agent Orchestrator processing tasks asynchronously, ensuring a non-blocking UI.

*(Upload Screenshot 3 here: Show the Targeted Practice Card with the advanced tongue-twisters)*
**Figure 3:** Dynamic Edge-Case Handling: Gemma automatically generating advanced mastery exercises when a student achieves a flawless 100% read.

---

## 🌍 The Problem: The Diagnostic Bottleneck
In early childhood education, fluency and phonetic mastery are critical indicators of future academic success. However, teachers managing classrooms of 30+ students face a mathematical impossibility: they cannot provide individual, real-time phonetic analysis for every child every day. 

Standard reading apps are passive—they listen, but they do not *understand*. They cannot detect the subtle difference between a student struggling with a specific consonant blend versus a student who is simply anxious and hesitating.

## 💡 The Solution: SpeakFlow
SpeakFlow introduces a **Zero-Latency Acoustic Pipeline**. As a student reads aloud, the platform instantly measures:
1. **Phonetic Accuracy:** Exact string-matching to highlight mispronounced words in real-time.
2. **Fluency (WPM):** Calculation of reading rate versus grade-level targets.
3. **Emotional Engagement:** Pitch variance and hesitation analysis (via `librosa`) to gauge confidence.

This raw telemetry is immediately injected into a suite of **5 Specialized Gemma 3N Agents** that synthesize the data into actionable insights and dynamically generated practice regimens for the teacher.

---

## 🧠 The Gemma 3N Multi-Agent Orchestrator
Instead of relying on a single, monolithic LLM prompt—which risks hallucination and context degradation—SpeakFlow utilizes a decoupled **Multi-Agent Orchestrator**. We engineered five distinct Gemma agents, executing in parallel via Python's `asyncio`, to process the acoustic telemetry:

### 1. 🗣️ The Phonetic Diagnostician
Ingests the exact words the student struggled with (captured via Whisper word-level timestamps) and identifies root phonetic causes (e.g., struggling with *tr* blends vs. hard *c* consonants).

### 2. 📊 The Difficulty Assessor
Calculates the delta between the student's current reading capacity and the text's Lexile complexity, advising if the student should scale up or down.

### 3. ❤️ The Engagement Monitor
Analyzes acoustic pauses (gaps > 400ms) and pitch variance to determine if the student's emotional state is *Confident*, *Anxious*, or *Frustrated*.

### 4. 🎯 The Practice Generator (Dynamic Edge-Case Handling)
Intercepts the data from the previous three agents to instantly generate custom practice sentences. 
* **The Edge Case:** If a student reads with 100% flawless accuracy, the agent does not simply stop. It utilizes Gemma's language generation to dynamically spawn advanced tongue-twisters and complex vocabulary to push the student toward mastery.

### 5. 📈 The Progress Synthesizer
Aggregates historical session data to plot long-term fluency trends.

---

## ⚙️ Technical Architecture 

SpeakFlow is built on a highly decoupled, dual-stack architecture to ensure heavy AI compute is completely offloaded from the client device.

```mermaid
graph TD
    A[Student Browser / Next.js] -->|WebM Audio Blob| B(FastAPI Backend)
    B --> C{Acoustic Processing}
    C -->|Transcription & Timestamps| D[OpenAI Whisper Base]
    C -->|Pitch Variance & Pauses| E[Librosa DSP]
    D --> F{Multi-Agent Orchestrator}
    E --> F
    F -->|Parallel Async| G[Gemma: Phonetic]
    F -->|Parallel Async| H[Gemma: Difficulty]
    F -->|Parallel Async| I[Gemma: Engagement]
    G --> J[Gemma: Practice Generator]
    H --> J
    I --> J
    J --> K[JSON Payload via React Context]
    K --> L[Live Dashboard Updates]
```

### 🛠️ The Tech Stack
* **Frontend:** Next.js 14, React, Tailwind CSS. Utilizes complex React Context hooks to asynchronously map incoming JSON payloads to the DOM, ensuring a fluid, non-blocking UI.
* **Backend:** Python, FastAPI. 
* **Acoustic Engine:** We dynamically inject FFmpeg binaries and pre-load the Whisper model directly into server memory on startup, achieving sub-second transcription latency.
* **LLM Engine:** Google Gemma 3N, utilizing strict prompt engineering for guaranteed JSON structural adherence.

---

## 🏁 Conclusion
By fusing localized, real-time acoustic signal processing with the immense reasoning capabilities of the Gemma 3N Multi-Agent Orchestrator, SpeakFlow represents the future of scalable, personalized educational technology.
