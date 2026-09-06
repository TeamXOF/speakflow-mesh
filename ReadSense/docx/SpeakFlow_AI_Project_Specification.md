# SpeakFlow AI
### Every reader. Every day.

A multi-agent AI reading companion that listens to a child read, diagnoses exactly what they're struggling with, and generates personalized practice — built on a hybrid signal-processing + Gemma 4 architecture.

---

## 1. The Problem

Every classroom has children who struggle to read aloud, and the struggle looks different for every child — one mixes up letter sounds, another loses confidence and freezes, another knows the words but reads slowly and choppily. Teachers see this happening but can't sit with each child individually every day to diagnose the exact issue and create targeted practice. With 25–30 students per class, personalized reading support becomes a luxury, not a norm. Kids fall behind quietly, and by the time it's noticed, it's a bigger problem to fix.

**The gap:** existing AI reading tools mostly do generic tutoring chat or plain transcription. Almost none combine careful acoustic analysis with multi-step reasoning to produce a precise, per-child diagnosis.

---

## 2. The Solution

A child reads a sentence aloud into a tablet, laptop, or phone mic. SpeakFlow AI:

1. **Listens carefully** — measures pauses, pitch, pacing, and repetition (signal processing, not AI)
2. **Diagnoses precisely** — five role-scoped Gemma 4 agents each examine the data from a different angle
3. **Responds specifically** — generates custom practice sentences targeting the exact weak spot, in an encouraging tone if the child seemed frustrated
4. **Tracks progress** — every session builds a trend line teachers and parents can actually read

In one line: **listen to how a child reads, figure out exactly what they struggle with, then create custom practice just for them — automatically, every day, for every child.**

---

## 3. How It Works — Technical Pipeline

```
Child reads aloud (mic)
        ↓
Signal Analysis Layer (DSP)
   — pause detection, pitch tracking, pacing, repetition, word-level alignment
        ↓
Orchestrator (Python controller)
        ↓
   ┌────────────┬────────────┬────────────┐
   Phonetic       Difficulty    Engagement
   Diagnostician  Classifier    Monitor
   (Gemma 4)      (Gemma 4)     (Gemma 4)
   ┌────────────┴────────────┴────────────┐
        ↓
   Practice Generator (Gemma 4)     Progress Tracker (Gemma 4)
        ↓                                   ↓
        └───────────────┬───────────────────┘
                         ↓
              Teacher Dashboard
```

**Important distinction:** this is *one* Gemma 4 model called five separate times, each with a different system prompt and a narrow, focused job — not five different models. This is the same architectural pattern Anthropic uses internally with Claude's own subagent system: isolate context, give each call one job, combine results at the end. It produces more reliable, debuggable output than one large prompt trying to do everything at once.

### The five agents

| Agent | Input | Job | Output |
|---|---|---|---|
| **Phonetic Diagnostician** | Word-level timing/pitch data | Identify which specific sounds are causing trouble | `{struggling_phonemes, confidence}` |
| **Difficulty Classifier** | Structured data + sentence text | Decide if the struggle is phonetic, cognitive (word recognition), or fluency/pacing | `{category, reasoning}` |
| **Engagement Monitor** | Pitch variance, pause length, hesitation markers | Flag frustration/anxiety vs. calm mechanical difficulty | `{frustration_signal, suggested_tone}` |
| **Practice Generator** | Outputs of agents 1–3 | Generate 5 targeted practice sentences, tone-matched | Practice sentences + encouraging note |
| **Progress Tracker** | Session history (DB) + today's diagnosis | Summarize trend in plain language | Natural-language report for teacher/parent |

Agents 1–3 run in parallel (no dependency on each other); the Practice Generator waits for all three; the Progress Tracker runs independently against stored history.

---

## 4. Technology Stack

| Layer | Technology | Why |
|---|---|---|
| Audio capture | Browser `MediaRecorder` API / mobile mic input | No special hardware needed |
| Voice activity detection | `webrtcvad` | Lightweight, real-time pause detection |
| Pitch & energy analysis | `librosa` | Standard, well-documented Python audio library |
| Word-level alignment | `whisper` (tiny/small) + timestamps | Aligns audio to expected sentence, even with imperfect speech |
| Diagnosis & generation | Gemma 4 via Google AI Studio API | Fast, capable, cost-effective for structured reasoning tasks |
| Agent orchestration | Python + `asyncio` | Simple, no heavy framework needed for 5 agents |
| Backend | Node.js / FastAPI | REST endpoints for session data, agent orchestration |
| Database | SQLite (MVP) → PostgreSQL (scale) | Session history, student profiles, progress tracking |
| Frontend | React + Tailwind CSS | Component-driven, matches the dashboard design system below |
| Charts | Recharts | Progress-over-time visualizations |
| Hosting | Vercel (frontend) + Railway/Render (backend) | Fast to ship for MVP/hackathon stage |

---

## 5. Design System — Matching the SpeakFlow AI Mockup

The interface follows a warm, approachable aesthetic — soft cream background, lavender-purple as the primary accent, rounded cards, and generous whitespace. This keeps the tool feeling encouraging rather than clinical, which matters for an app children will interact with directly.

**Color palette**
- Background: warm cream/off-white (`#FAF7F2`-ish)
- Primary accent: soft lavender-purple (`#C9BFF0`-ish), used for primary buttons, active nav state, key data
- Secondary accent: soft pink (used for streaks, stars, secondary highlights)
- Text: near-black for headings, muted gray for secondary text
- Status colors: green (complete/good), amber (in progress), gray (pending)
- All cards: white fill, thin black border, generous corner radius (~16px)

**Typography**
- Bold, rounded sans-serif for headings
- Clear hierarchy: large numbers for key metrics (85%, 82, 18%) draw the eye immediately
- Monospace-style labels for section headers (e.g. "LIVE READING SESSION", "SESSION SUMMARY") in small caps — gives it a slight technical/dashboard feel without losing warmth

**Layout pattern**
- Fixed left sidebar: logo + tagline at top, nav items with icons, current student card, encouragement message card, log out at bottom
- Top bar: greeting + context line, primary CTA button ("Start New Reading"), notifications, avatar
- Main content: card-based grid, 2 columns on larger cards, consistent padding and border treatment across all cards

---

## 6. Screen-by-Screen Breakdown

### Dashboard (home)
The command center. Shows:
- **Live Reading Session card** — real-time transcript with words highlighted as they're spoken, live waveform, and three live stats: tempo (WPM), accuracy, confidence
- **Session Summary card** — four-stat grid: minutes read, overall accuracy, improvement %, stars earned (gamification for the child)
- **AI Diagnosis card** — a radial score (e.g. 82/100) plus a breakdown by category (phonetic accuracy, word fluency, pace & rhythm, comprehension, emotional state), each tagged Good/Needs Practice, plus a one-line focus recommendation
- **AI Agents at Work card** — literally shows the 5-agent pipeline status in real time (Complete/In Progress/Pending) — this doubles as a trust-building feature, since parents/teachers can see the reasoning isn't a black box
- **Personalized Practice card** — shows the current focus area and a ready-to-use practice sentence with a "Start Practice" button
- **Progress Over Time card** — a week-view line chart of accuracy/improvement, plus a callout stat ("18% improvement this week")

### Students
Roster view — list of all students a teacher manages, with quick-glance status (grade, level, last session date, current focus area).

### Reading Sessions
Full history of past sessions per student, filterable by date, with transcript, audio playback, and diagnosis available for each.

### AI Agents
A dedicated page showing what each of the 5 agents does, their current status across active sessions, and (for technically curious teachers/admins) a simplified explanation of the pipeline.

### Practice Center
Library of generated practice sets, organized by focus area (blends, long words, sight words, pacing, etc.), reusable across students with the same needs.

### Reports
Exportable summaries for parent-teacher conferences — plain-language progress reports generated by the Progress Tracker agent.

### Progress Tracker
Longer-horizon view than the dashboard's weekly chart — month/term-level trends per student, per skill category.

### Settings
Account, notification preferences, student roster management, data export/privacy controls.

---

## 7. Key Features

- Real-time transcript with live word highlighting during recording
- Radial diagnostic score with category breakdown
- Transparent multi-agent pipeline visible to the user (builds trust — not a black box)
- Emotional-state detection with tone-adjusted practice generation
- Auto-generated, targeted practice sentences (not generic drills)
- Session-over-session progress tracking with plain-language reports
- Gamification elements (stars, streaks, encouragement messages) to keep children motivated
- Teacher-facing focus recommendations ("Focus on blends (tr, dr, br) and long words")

---

## 8. Data Model (simplified)

```
Student { id, name, grade, level, created_at }
Session { id, student_id, audio_url, transcript, sentence_target, timestamp }
SignalData { session_id, pauses[], pitch_series[], wpm, repetitions[] }
Diagnosis { session_id, phonetic_result, difficulty_category, engagement_state, overall_score }
PracticeSet { session_id, sentences[], focus_area, tone }
ProgressReport { student_id, period, summary_text, trend_metrics }
```

---

## 9. Honest Limitations (worth stating upfront)

- A single reading session isn't enough data for a clinical diagnosis — this is a **screening and practice tool**, not a replacement for a speech-language pathologist. The Phonetic Diagnostician's confidence score reflects this honestly rather than overclaiming.
- Whisper-based alignment can struggle with very young or unclear speech — worth flagging as a known constraint during a demo.
- Gemma 4 costs scale with the number of agent calls (5x per session vs. 1x); worth mentioning as a deliberate accuracy-vs-cost tradeoff if asked.

---

## 10. Suggested Build Order (MVP)

1. Audio capture + VAD/pause detection working end-to-end
2. Whisper word-alignment wired in (know *which* word had the issue)
3. Gemma 4 agent pipeline (all 5 prompts, orchestrated via asyncio)
4. Dashboard UI matching the design system above (Live Session + Diagnosis + Practice cards first)
5. SQLite storage + Progress Tracker + charts
6. Polish, gamification elements, and demo script
