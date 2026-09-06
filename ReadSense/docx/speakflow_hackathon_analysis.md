# SpeakFlow AI — Hackathon Readiness Analysis
### Build with Gemma: NUTECH Islamabad · $1,000 USD · July 15, 2026

---

## 🏆 Verdict: YES — This Is a STRONG Hackathon Project

> **Fit Score: 9.2 / 10** for the "Build with Gemma" track.

SpeakFlow AI hits every criterion the judges are looking for. Here's why it's competitive:

| Judging Dimension | SpeakFlow Score | Why |
|---|---|---|
| **Gemma model integration** | ✅ Native | 5-agent pipeline, ALL powered by Gemma 4 |
| **Education domain** | ✅ Perfect | Child reading literacy = core Education AI track |
| **Real-world impact** | ✅ Strong | Scalable to Pakistan's literacy challenge |
| **Technical depth** | ✅ High | DSP + LLM hybrid is genuinely sophisticated |
| **Demo-ability** | ✅ Visual | Live waveform + real-time transcript is *showstopping* |
| **Design quality** | ✅ Excellent | Dashboard mockup is polished and professional |
| **Originality** | ✅ Unique | No other EdTech tool does acoustic + multi-agent diagnosis |

---

## 📋 What You Have Right Now

### ✅ Strengths (Already Solid)

1. **The Concept is Airtight**
   The problem → solution → pipeline logic is crystal clear and well-scoped. The spec reads like a real product pitch, not a student project.

2. **Dashboard Mockup is Exceptional**
   The design shown is demo-ready: live transcript with word highlighting, waveform visualizer, AI Agents at Work panel (shows pipeline transparency), radial diagnostic score, progress charts. This is exactly what judges want to see.

3. **Flow Diagram is Clean and Explainable**
   The Flowdiagram clearly shows the 5-agent Gemma architecture. Purple = diagnosis agents, Coral = generation/tracking. This is presentation-ready as a slide.

4. **Gemma Integration is Deep, Not Shallow**
   5 role-scoped prompts = you're not just using Gemma as a chatbot. You're using it as a reasoning engine with structured output per agent. Judges will notice this.

5. **Education + Health overlap**
   Reading difficulties are both an education AND early health screening issue (dyslexia markers, speech delay). This hits two of the three hackathon tracks.

---

## ⚠️ Risks & Honest Gaps

### 🔴 Risk 1: Whisper Alignment in Hackathon Time
`whisper` word-level timestamp alignment can be slow or unreliable on very young/accented speech. For the hackathon MVP, you may need to simplify this to sentence-level confidence rather than word-level.

**Mitigation:** Pre-record a clean demo audio clip. Don't rely on live child speech in the demo. Show a polished replay.

### 🔴 Risk 2: Audio Pipeline Complexity
`librosa` + `webrtcvad` + `MediaRecorder` + `whisper` is 4 libraries just for the input layer. This is the hardest part to get working in 3 days.

**Mitigation:** Build the AI agent pipeline first with mocked audio data. Show the agents working. Add real audio capture last.

### 🟡 Risk 3: 5 × Gemma API Calls Per Session = Latency
Sequential or even parallel Gemma calls will have visible latency in a live demo.

**Mitigation:** Show the "AI Agents at Work" panel with simulated streaming — agents go from Pending → In Progress → Complete with a slight delay. This looks *better* than instant (it shows the pipeline working).

### 🟡 Risk 4: No Code Exists Yet
The project is currently a specification + mockups. All technical work starts from zero.

**Mitigation:** With your AG Kit setup and 3 days, this is buildable as an MVP. See roadmap below.

---

## 🎯 Hackathon Strategy: What to Build vs. What to Mock

### Build (Real, Working)
| Component | Effort | Priority |
|---|---|---|
| Gemma 4 agent pipeline (all 5 prompts) | Medium | 🔴 P0 |
| FastAPI backend orchestrator | Medium | 🔴 P0 |
| Dashboard UI (React) — core cards | Medium | 🔴 P0 |
| Audio capture (MediaRecorder) + basic VAD | Hard | 🟡 P1 |
| SQLite session storage | Easy | 🟡 P1 |

### Demo-Quality Mock (Acceptable for Hackathon)
| Component | Why Mock is OK |
|---|---|
| Word-level Whisper alignment | Too slow/flaky for 3 days — sentence level is fine |
| Real-time streaming waveform | CSS animation + pre-recorded data is indistinguishable |
| Progress chart history | Seed 7 days of dummy data |
| Emotional state detection | Use pause-count heuristic, not true ML |

---

## 🏗️ Dashboard → Multi-Page Breakdown Plan

The mockup shows everything in one view. Here's how to split it into clean pages:

```
SpeakFlow AI (React SPA with sidebar nav)
├── /dashboard          → Main command center (Live Session + Summary + Diagnosis + Agents + Practice + Progress)
├── /students           → Roster table with status badges
├── /sessions           → Session history per student (filterable)
├── /agents             → Detailed agent pipeline view + status
├── /practice           → Practice sentence library by category
├── /reports            → Exportable progress reports
├── /progress           → Long-term trend charts
└── /settings           → Account + privacy
```

### Page Priority for Hackathon (Build only these 3)
1. **`/dashboard`** — the whole story in one screen. This IS your demo.
2. **`/agents`** — show the Gemma pipeline visually. Technical trust-builder.
3. **`/sessions`** — show history with a transcript. Proves it works over time.

---

## 🤖 Gemma Integration Specifics

### Model Choice
Use **Gemma 4** via Google AI Studio API (already specified). The `gemma-4-9b-it` (instruction-tuned) variant is ideal for structured reasoning tasks.

### Agent Prompt Architecture
Each agent gets a strict system prompt + structured JSON output schema:

```python
# Example: Phonetic Diagnostician
system_prompt = """
You are a phonetic diagnostician. Given word-level timing and pitch data from
a child reading aloud, identify which specific phonemes are causing difficulty.
Return JSON: {"struggling_phonemes": [...], "confidence": 0.0-1.0, "reasoning": "..."}
"""
```

### Parallel Execution (asyncio)
Agents 1, 2, 3 run concurrently. Agent 4 waits for all three. Agent 5 runs independently:

```python
async def run_pipeline(signal_data, session_history):
    diagnosis_1, diagnosis_2, diagnosis_3 = await asyncio.gather(
        phonetic_agent(signal_data),
        difficulty_agent(signal_data),
        engagement_agent(signal_data)
    )
    practice = await practice_generator(diagnosis_1, diagnosis_2, diagnosis_3)
    progress = await progress_tracker(session_history)  # independent
    return combine(diagnosis_1, diagnosis_2, diagnosis_3, practice, progress)
```

---

## 📅 Recommended 3-Day Build Roadmap

> **Hackathon date: July 15, 2026** — You have ~3 days from July 12.

### Day 1 — Backend + AI Core (July 12)
- [ ] Set up FastAPI project structure
- [ ] Write all 5 Gemma agent prompts + test each individually
- [ ] Build asyncio orchestrator with mock signal data
- [ ] Test full pipeline: input → 5 agents → combined output JSON
- [ ] SQLite schema: Student, Session, Diagnosis, PracticeSet

### Day 2 — Frontend Dashboard (July 13)
- [ ] React + Vite setup with sidebar nav
- [ ] Build `/dashboard` page matching the mockup exactly
- [ ] Implement "AI Agents at Work" panel with live status polling
- [ ] Wire up practice sentence display
- [ ] Build `/agents` page with pipeline visualization

### Day 3 — Audio + Polish + Demo Prep (July 14)
- [ ] MediaRecorder audio capture → send to FastAPI
- [ ] Basic pause detection (webrtcvad or silence threshold)
- [ ] Simulated live waveform animation
- [ ] Seed database with demo student + 7 sessions of history
- [ ] Record a polished demo video as backup
- [ ] Practice the pitch: problem → solution → live demo → impact

---

## 💡 Presentation Tips for Judges

1. **Lead with the child's struggle** — "30 kids. 1 teacher. No time for individual diagnosis." That's the hook.
2. **Show the agents working in real-time** — the "AI Agents at Work" card is your secret weapon. No other team will have pipeline transparency.
3. **Mention the multi-agent pattern explicitly** — say "same Gemma model, 5 role-scoped calls, parallel execution." Judges who know AI will be impressed.
4. **Show the emotional awareness** — "Slightly Anxious" detection that changes the *tone* of practice sentences. This is uniquely human-centered.
5. **Have a fallback demo** — if live audio fails, play a pre-recorded session. Never risk a broken live demo.

---

## 🔑 One-Line Pitch
> *"SpeakFlow AI listens to how a child reads, diagnoses exactly what they struggle with using 5 specialized Gemma agents, and generates personalized practice — automatically, every day, for every child."*

---

## ❓ Open Questions Before We Start Building

1. **Team size?** Solo or with teammates? This affects which parts to parallelize.
2. **Gemma API key ready?** Google AI Studio key for Gemma 4 — do you have this?
3. **Which part first?** Do you want to start with the AI pipeline (backend) or the dashboard UI (frontend)? 
4. **React experience?** Should we use Next.js or Vite + React? Next.js adds SSR complexity; Vite is faster to ship.
5. **Demo style?** Live demo on your machine, or a deployed URL for judges to click?
