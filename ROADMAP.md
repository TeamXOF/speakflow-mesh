# SpeakFlow — Master Roadmap

> **How to use this file:**  
> This is the single source of truth for the entire build. Every agent that works on this project must read this file first, track their phase here, and never skip ahead without completing the stated verification criteria.  
> Status tags: `[ ]` not started · `[/]` in progress · `[x]` done

---

## 🤖 Model Assignment Guide

> Use this table to pick the right AI model for each phase. Opus and Sonnet have usage limits — reserve them for planning and reviews only.

| Model | Use For | Avoid For |
|---|---|---|
| **Gemini 3.1 Pro** | Complex UI pages, state management, API integration, WebSocket logic, RTL/i18n, architecturally complex backend phases | Simple scaffolding |
| **Flash 3.8** | Project setup, simple pages, CRUD endpoints, routine integrations, repetitive tasks | Visually complex kid-facing screens |
| **Opus 4.6** | Roadmap updates, architecture reviews, debugging hard issues, final audit | Heavy coding (rate-limited) |
| **Sonnet 4.6** | Documentation, code reviews, plan adjustments, memory updates | Heavy coding (rate-limited) |
| **Kimi K3** | Full-codebase analysis, integration passes, long-context grep/audit | Real-time UI building |

### Per-Phase Quick Reference

| Phase | Model | Phase | Model |
|---|---|---|---|
| 0 — Setup | Flash 3.8 | A — Backend Scaffold | Flash 3.8 |
| 0.5 — Project Init | Flash 3.8 | B — Groq STT | Flash 3.8 |
| 1 — Story Map (S1) | **Gemini 3.1 Pro** | C — Librosa Acoustic | **Gemini 3.1 Pro** |
| 2 — Checkpoint (S2) | **Gemini 3.1 Pro** | D — Dictionary | Flash 3.8 |
| 3 — Phase 1 Feedback (S3) | **Gemini 3.1 Pro** | E — Gemini Integration | **Gemini 3.1 Pro** |
| 4 — Phase 2 Feedback (S4) | **Gemini 3.1 Pro** | F — Local Whisper | Flash 3.8 |
| 5 — Rewards (S5) | Flash 3.8 | G — WebSocket Mesh | **Gemini 3.1 Pro** |
| 5.5 — Student Flow Wire | **Gemini 3.1 Pro** | H — Sync Logic | Flash 3.8 |
| 6 — Dashboard (T1) | **Gemini 3.1 Pro** | I — REST API | Flash 3.8 |
| 6.5 — Students List | Flash 3.8 | J — Fallbacks | **Gemini 3.1 Pro** |
| 7 — Student Progress (T2) | Flash 3.8 | K — Backend Integration | Gemini 3.1 Pro |
| 8 — Session Analysis (T3) | Flash 3.8 | X — Final Verification | **Opus 4.6** |
| 9 — Checkpoint Table (T4) | Flash 3.8 | Roadmap updates | Opus 4.6 |
| 10 — API Wiring | **Gemini 3.1 Pro** | Code reviews | Sonnet 4.6 |
| 11 — Settings + Pipeline | Flash 3.8 | Documentation | Sonnet 4.6 |
| 12 — Real Data | Gemini 3.1 Pro | Codebase audits | Kimi K3 |
| 13 — Urdu/RTL | Gemini 3.1 Pro | | |
| 14 — Parent Card | Flash 3.8 | | |
| 15 — Integration Pass | **Kimi K3** | | |

---

## 🧭 Project Overview

**What we're building:** SpeakFlow — an intelligent, story-based speech and reading companion designed for young learners. It evaluates real-time pronunciation using acoustic analysis (not just transcription), provides AI-powered feedback, and gives teachers a diagnostic dashboard.

**Two audiences:**
1. **Kids (Student Experience)** — Gamified, checkpoint-driven story reader. Simple, encouraging, and playful.
2. **Teachers (Admin Experience)** — Monitoring dashboard, session analytics, class-wide phoneme error heatmap.

**Current state of the repo:** The `main`, `frontend`, and `backend` branches all contain only documentation — `README.md`, `Context/` (4 reference docs), and `assets/` (1 design image). **There is no existing codebase.** Everything is built from scratch.

**Status legend (used throughout this file):**
- `BUILT` — must be verified working before pitch
- `TO BUILD` — planned and in scope
- `ROADMAP-ONLY` — future vision; do NOT demo or build now

---

## 🎨 Design System (Source of Truth)

> ⚠️ **NEVER invent new colors or components. Always use these tokens.**  
> The `assets/speakflow-ui-guide.png` image is the visual source of truth. It shows ALL screens merged into one image. Your job is to dissect and implement each screen as a separate page.

### Color Tokens
| Token | Hex | Usage |
|---|---|---|
| `--bg-base` | `#FAF7F2` | Cream page background |
| `--card-bg` | `#FFFFFF` | White card fill |
| `--accent-primary` | `#C9BFF0` | Soft lavender — buttons, highlights, progress bars |
| `--accent-secondary` | `#F5C6D8` | Soft pink — secondary accents, badges |
| `--text-primary` | `#1A1A1A` | Headings, body text |
| `--text-secondary` | `#484848` | Captions, secondary labels |
| `--success` | `#34C759` | Correct words, positive states |
| `--warning` | `#FFB020` | Needs practice, caution states |
| `--error` | `#FF4D4F` | Missed words, error states |
| `--border-color` | `#1A1A1A` | 1px black border on all cards |

### Typography
| Usage | Font | Weight/Size |
|---|---|---|
| UI Text / Headings | DM Sans | H1: 32px Bold, H2: 20px Bold, Body: 16px Regular, Caption: 14px Regular |
| Labels / Numbers / Data | JetBrains Mono | Label: 14px Medium |

### Core Components (from design guide)
- **`.speakflow-card`** — white card, 16px border-radius, 1px `--border-color` border
- **Primary Button** — lavender (`#C9BFF0`) fill, bold text, rounded corners
- **Secondary Button** — outlined, no fill, `--border-color` border
- **Chip** — small pill labels (e.g. `New`, `In Progress`) — rounded, colored background
- **Progress Bar** — lavender fill on cream track
- **Input Field** — minimal, placeholder in `--text-secondary`

### General UI Guidelines (from design image footer)

> 🔴 **These 6 principles are mandatory for EVERY screen. Do not violate any of them.**

1. **Keep it clean** — White space is your friend. Don't overcrowd.
2. **Use friendly language** — Simple, encouraging, and kid-appropriate copy.
3. **Feedback first** — Show results quickly (API Phase 1), then detailed feedback (API Phase 2).
4. **Consistent patterns** — Same icons, colors, and behaviors everywhere.
5. **Accessible design** — Large tap targets (≥48px), good contrast, readable text.
6. **Responsive** — Kid-facing screens should work on tablets (min 768px). Teacher dashboard is laptop-first (min 1024px).

---

## 🗺️ UI Pages to Build (Extracted from `assets/speakflow-ui-guide.png`)

> The design image shows all screens merged. Before building, your first task is to mentally — and then physically — separate them into these distinct pages:

### Student-Facing Pages (Kid Experience)
| # | Page | Description |
|---|---|---|
| S1 | **Story Map / Chapter Select** | Visual adventure map; kids pick a chapter/story. Shows completed, in-progress, and locked states. |
| S2 | **Checkpoint Screen** | Shows checkpoint number (e.g. "Checkpoint 2 of 5"), target sentence in large text, large mic button ("Tap to start recording"). |
| S3 | **Recording & API Phase 1 Feedback** | Live waveform while recording. On completion: 85% score, per-word colored badges (Good/Needs practice/Missed), accuracy/fluency/pauses metrics. |
| S4 | **Gemini Feedback (API Phase 2)** | AI-generated encouraging tip. Purple star mascot with speech bubble. "Let's Practice Together" section. Arrives async, animates in. |
| S5 | **Progress & Rewards** | Celebrates checkpoint completion: stars earned, badge unlocked, progress bar ("2/5"), "Continue Adventure" button. |

### Teacher-Facing Pages (Admin Experience)
| # | Page | Description |
|---|---|---|
| T0 | **Students List** | Student roster with name, level, last active, link to detail view. |
| T1 | **Overview Dashboard** | Class snapshot: stat cards, "Class Performance (Last 7 Days)" chart, "Top Struggling Areas" bar chart. |
| T2 | **Student Progress** | Individual student drill-down: metric cards, "Progress Over Time" chart, "Struggling Words" chips. |
| T3 | **Session Analysis** | Single session detail: per-word breakdown, hesitation detection, Gemini feedback panel, recommended practice. |
| T4 | **Checkpoint Overview** | Class-wide checkpoint progress table: avg. accuracy per checkpoint, completion counts. |

### Demo Story Content (use across both frontend and backend)

> ⚠️ Use these exact chapter names and sentences so frontend and backend mock data match.

**Story: "The Forest Adventure"**
| Checkpoint | Chapter Name | Target Sentence |
|---|---|---|
| 1 | The Brave Little Rabbit | "The brave little rabbit hopped through the meadow." |
| 2 | Climbing the Mountain | "The little explorer climbed the steep mountain slowly." |
| 3 | Lost in the Forest | "She found a hidden path between the tall dark trees." |
| 4 | The Hidden Treasure | "The golden key unlocked a chest full of sparkling gems." |
| 5 | The Big Celebration | "All the forest animals gathered to celebrate together." |

---

## 🏗️ Tech Stack

### Frontend
- **Framework:** Next.js (App Router), React, TypeScript
- **Styling:** Tailwind CSS (CSS variable–based tokens from `globals.css`) — **no component library (no shadcn, no MUI)**
- **Charts:** recharts
- **Icons:** lucide-react
- **Fonts:** DM Sans (UI), JetBrains Mono (data labels), Noto Nastaliq Urdu (for Urdu rendering only)
- **State:** React Context (`SpeakFlowContext`) — no external state library

### Backend
- **Language/Framework:** Python, FastAPI
- **Audio/Acoustic:** librosa (pitch, formants, ZCR, spectral energy)
- **STT (Online):** Groq Whisper API — fast, cloud-based
- **STT (Offline):** faster-whisper or whisper.cpp (INT8 quantized) — runs locally on teacher laptop
- **LLM/AI:** Gemini 3.5 Flash-Lite via Google AI Studio API (free tier)
  - Job A: Turn structured acoustic mismatch data → age-appropriate feedback text
  - Job B: Multimodal audio judgment on ambiguous hesitation pauses
- **Phoneme Dictionary:** PronouncUR (build-time tool for Urdu G2P) + manual native-speaker overrides for high-stakes pairs (ق/ک, ع, ح, خ)
- **Database:** SQLite (local persistence; no raw audio stored — only aggregated metrics)
- **Protocols:** REST API + WebSockets

---

## 📐 API Contract Summary (Frontend ↔ Backend)

> The frontend **must** follow this contract exactly. Do not invent endpoints.

**Base URL:** Resolved dynamically — call `GET /api/v1/health` first, cache result for 5s.

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/v1/health` | GET | Returns `{ mode, groq_reachable, gemini_reachable, server_time }` |
| `/api/v1/sessions` | POST | Create a reading session: `{ student_id, story_id, language }` |
| `/api/v1/sessions/{id}/analyze` | POST | Submit checkpoint audio (`multipart/form-data`: `audio`, `checkpoint_id`) |
| `/api/v1/sessions/{id}` | GET | Session summary/progress |
| `/api/v1/sessions/{id}/feedback/{checkpoint_id}` | GET | Poll for API Phase 2 feedback (alternative to WebSocket) |
| `/api/v1/students/{id}/dashboard` | GET | Educator analytics: `?range=session\|week\|all` |
| `/api/v1/sync` | POST | Manually trigger offline→cloud sync |
| `/ws/sessions/{id}` | WebSocket | Receive async API Phase 2 feedback push |

**Two-Phase Response (critical — do NOT treat as one):**
- **API Phase 1** (~400ms, immediate): `{ transcript, words[], wpm, hesitations[], stt_source, latency_ms, warnings[] }`
- **API Phase 2** (async, ~1-3s): `{ feedback_text, engagement_state, comprehension_question, practice_recommendation, feedback_source, latency_ms }`

> ⚠️ Throughout this roadmap, "API Phase 1" and "API Phase 2" always refer to the backend's two-phase response. "Phase 1", "Phase 2", etc. without "API" prefix refer to the frontend build phases listed below.

**Error Envelope:**
```json
{ "error": { "code": "GROQ_UNAVAILABLE", "message": "...", "retryable": false } }
```
Codes: `VALIDATION_ERROR` · `SESSION_NOT_FOUND` · `AUDIO_TOO_SHORT` · `GROQ_UNAVAILABLE` · `GEMINI_UNAVAILABLE` · `INTERNAL_ERROR`

---

---

# 🖥️ FRONTEND BUILD PHASES (0–15)
> **Assigned to:** Frontend developer  
> **Start immediately** — no backend dependency until Phase 10.  
> **Backend can run in parallel** — see Backend section below.

---

## Phase 0 — Design Dissection & Planning
> **Model:** Flash 3.8  
> **Goal:** Study the design image and plan before writing code.

- [ ] **0.1** Open `assets/speakflow-ui-guide.png` and identify all 10 distinct screens (S1–S5 student, T0–T4 teacher) listed in the UI Pages table above. Write down which section of the image corresponds to which screen.
- [ ] **0.2** Read the Design System section above and the General UI Guidelines. Internalize the 6 principles.
- [ ] **0.3** Read `Context/speakflow_ui_analysis_roadmap.md` for additional detail on each screen's behavior and expected interactions.

### 🧪 How to Verify (Phase 0)
> You can answer "yes" to all of these:
1. Can you name all 10 screens and describe what each one shows?
2. Can you list all 10 color tokens from memory or from this roadmap?
3. Do you know the two fonts and when to use each?
4. Have you read the General UI Guidelines and can recite the 6 principles?

---

## Phase 0.5 — Project Initialization (From Scratch)
> **Model:** Flash 3.8  
> **Goal:** Bootstrap the Next.js project, install dependencies, set up the design system, and create the app shell.

> 🔴 **There is no existing codebase.** The repo currently has only `README.md`, `Context/`, and `assets/`. Everything is created from scratch in this phase.

- [ ] **0.5.1** Initialize a Next.js project with TypeScript and Tailwind CSS in the project root:
  ```bash
  npx create-next-app@latest ./ --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*"
  ```
- [ ] **0.5.2** Install additional dependencies:
  ```bash
  npm install recharts lucide-react date-fns
  ```
- [ ] **0.5.3** Set up `app/globals.css` with all design tokens as CSS custom properties:
  ```css
  :root {
    --bg-base: #FAF7F2;
    --card-bg: #FFFFFF;
    --accent-primary: #C9BFF0;
    --accent-secondary: #F5C6D8;
    --text-primary: #1A1A1A;
    --text-secondary: #484848;
    --success: #34C759;
    --warning: #FFB020;
    --error: #FF4D4F;
    --border-color: #1A1A1A;
  }
  ```
  Map these into Tailwind via `@theme inline` or `tailwind.config.ts`.
- [ ] **0.5.4** Load fonts: DM Sans and JetBrains Mono via `next/font/google`. Set DM Sans as the default body font. JetBrains Mono as a utility class (e.g. `.font-mono`).
- [ ] **0.5.5** Create the global layout shell in `app/layout.tsx`:
  - A **fixed sidebar** (left, ~240px wide) with the SpeakFlow logo, navigation links (Dashboard, Students, Sessions, Progress, Reports, Settings, Pipeline Monitor), and styling matching the design image (white bg, black border-right).
  - A **topbar** (top, full width minus sidebar) with a greeting ("Good morning, Teacher!"), date, and notification bell icon.
  - A **main content area** that renders `{children}` with `--bg-base` background.
- [ ] **0.5.6** Create the `.speakflow-card` CSS utility class: white background, 16px border-radius, 1px solid `--border-color`.
- [ ] **0.5.7** Create a `context/SpeakFlowContext.tsx` with initial empty state — just the provider wrapper, notification system, and placeholder for session state. This will be expanded in later phases.
- [ ] **0.5.8** Create `lib/api.ts` with a stub `resolveApiBase()` function that returns a hardcoded localhost URL for now. Add TypeScript types for the API Phase 1 response, API Phase 2 payload, and error envelope (from the API Contract section above).
- [ ] **0.5.9** Create placeholder route folders: `app/dashboard/`, `app/read/`, `app/students/`, `app/sessions/`, `app/progress/`, `app/reports/`, `app/settings/`, `app/pipeline/`. Each with a minimal `page.tsx` that renders its name.

### 🧪 How to Verify (Phase 0.5)
> **Do these steps yourself — do not skip any.**

1. Run `npm run dev` in terminal. Open `http://localhost:3000` in your browser.
2. ✅ The app loads without errors in the browser console (press F12 to check).
3. ✅ You see the sidebar on the left with all navigation links.
4. ✅ You see the topbar at the top with a greeting and date.
5. ✅ The background is cream (`#FAF7F2`), not white or gray.
6. ✅ Click each sidebar link — each route loads and shows its placeholder name.
7. ✅ Open browser DevTools → Elements → `<html>` tag → check Computed styles: the CSS variables `--bg-base`, `--accent-primary`, etc. are all defined.
8. ✅ The font in the sidebar/topbar is DM Sans (check in DevTools → Computed → `font-family`).
9. Run `npx tsc --noEmit` — no TypeScript errors.

---

## Phase 1 — Story Map / Chapter Select (S1)
> **Model:** Gemini 3.1 Pro  
> **Goal:** Build the kid-facing adventure map where children select a chapter to read.  
> **Route:** `app/read/page.tsx`  
> **No backend needed** — use static mock data for chapters.

### What to build (from design image):
- A visual adventure map with an illustrated nature scene (green hills, path winding upward, trees, soft sky)
- A winding path with **numbered chapter stops** (circles with numbers 1, 2, 3, etc.)
- Each stop has three visual states:
  - ✅ **Completed** — filled circle, checkmark, solid color
  - 🟡 **In Progress** — highlighted/pulsing, brighter color, current position indicator
  - 🔒 **Locked** — grayed out, lock icon, not clickable
- Header: "Your Journey" title, subtitle "Choose a chapter to continue"
- Top-right: star count badge (e.g. `⭐ 285`)
- Bottom legend: "Completed · In Progress · Locked" with colored dots
- Clicking an unlocked chapter navigates to `/read/[chapterId]` (Checkpoint Screen)

### Design rules:
- Large tap targets (minimum 64×64px per chapter circle)
- Friendly, rounded shapes — lean into the lavender/pink palette for UI elements
- The map illustration can use greens, browns, blues for the nature scene
- **No sidebar or topbar on this screen** — this is a kid-facing fullscreen experience
- No data tables, no technical labels

### Mock data:
```ts
const DEMO_CHAPTERS: Chapter[] = [
  { id: "ch1", title: "The Brave Little Rabbit", status: "completed", checkpointCount: 5, completedCount: 5 },
  { id: "ch2", title: "Climbing the Mountain", status: "in_progress", checkpointCount: 5, completedCount: 2 },
  { id: "ch3", title: "Lost in the Forest", status: "locked", checkpointCount: 5, completedCount: 0 },
]
```

### 🧪 How to Verify (Phase 1)
1. Navigate to `http://localhost:3000/read` in your browser.
2. ✅ You see an illustrated adventure map — not a plain list or table.
3. ✅ There are numbered chapter stops on a winding path.
4. ✅ Chapter 1 shows a completed state (checkmark, filled).
5. ✅ Chapter 2 shows an in-progress state (highlighted/glowing).
6. ✅ Chapter 3 shows a locked state (grayed, lock icon).
7. ✅ Clicking Chapter 2 (in-progress) navigates you to the checkpoint screen.
8. ✅ Clicking Chapter 3 (locked) does nothing — no navigation.
9. ✅ There is NO sidebar or topbar on this screen.
10. ✅ The star count badge is visible in the top-right area.
11. ✅ The screen looks age-appropriate for a 6-8 year old — large, colorful, playful.

---

## Phase 2 — Checkpoint Screen (S2)
> **Model:** Gemini 3.1 Pro  
> **Goal:** Build the checkpoint reading screen where a kid sees the target sentence and taps to record.  
> **Route:** `app/read/[chapterId]/page.tsx`  
> **No backend yet** — mic recording is real, but analysis results use mock data. Actual API submission wired in Phase 10.

### What to build (from design image):
- Top-left: back arrow (← returns to story map)
- Top-center: checkpoint counter ("Checkpoint 2 of 5")
- Top-right: star count badge (⭐ 285)
- Center: large, prominent target sentence in **DM Sans, 28–32px** — e.g. "The little explorer climbed the steep mountain slowly."
- Below sentence: instruction text "Take a deep breath and read aloud!"
- Bottom-center: **large circular mic button** — lavender fill, white mic icon, visually the biggest thing on screen
- Below mic: "Tap to start recording"

### Interaction states:
| State | Visual |
|---|---|
| `idle` | Mic button shown, ready to tap |
| `recording` | Mic button pulses red/pink, live waveform animation shown above or around the button |
| `processing` | Subtle spinner or "Analyzing..." text |
| `complete` | Transitions to the feedback screen (Phase 3) |

### Important:
- The waveform during recording should use a real `AnalyserNode` from the Web Audio API — capture live mic audio and draw a waveform visualization. Build this as a reusable `<WaveformVisualizer>` component.
- For now, the `complete` state can be triggered by a 3-second mock timeout OR by actually stopping the recording. Phase 3's mock data will be shown.
- **No sidebar/topbar** — same fullscreen kid experience as S1.

### Mock checkpoint data:
```ts
const DEMO_CHECKPOINTS = [
  { checkpoint_id: "cp_1", target_text: "The brave little rabbit hopped through the meadow." },
  { checkpoint_id: "cp_2", target_text: "The little explorer climbed the steep mountain slowly." },
  { checkpoint_id: "cp_3", target_text: "She found a hidden path between the tall dark trees." },
  { checkpoint_id: "cp_4", target_text: "The golden key unlocked a chest full of sparkling gems." },
  { checkpoint_id: "cp_5", target_text: "All the forest animals gathered to celebrate together." },
]
```

### 🧪 How to Verify (Phase 2)
1. Navigate to `http://localhost:3000/read/ch2` (or however the route is structured).
2. ✅ You see "Checkpoint 2 of 5" at the top.
3. ✅ The target sentence is displayed in large, readable text (28-32px).
4. ✅ There is a large, obvious mic button at the bottom.
5. ✅ Tap the mic button → the browser asks for microphone permission (click "Allow").
6. ✅ While "recording": the mic button changes appearance (pulse/color change), and you see a live waveform animation reacting to your voice.
7. ✅ Tap again (or wait for timeout) → you see a brief "processing" state.
8. ✅ After processing, the screen transitions to show feedback (Phase 3 content).
9. ✅ The back arrow navigates you back to the story map.
10. ✅ No sidebar/topbar visible. Screen feels fullscreen and kid-friendly.

---

## Phase 3 — Recording Feedback: API Phase 1 UI (S3)
> **Model:** Gemini 3.1 Pro  
> **Goal:** Build the immediate per-word feedback screen shown right after recording.  
> **No backend yet** — use mock API Phase 1 data.

### What to build (from design image):
- A cute purple star/cloud mascot character (matches the design image's character — see the "Great job!" screen) saying "Great job!" or "Nice try!"
- A large **score circle**: "85%" with a label like "Good Reading!"
- Three metric pills in a row: **Accuracy** (85%) · **Fluency** (78 WPM) · **Pauses** (2)
- A **"Word by Word"** section: each word displayed as a colored chip:
  - 🟢 Green chip (`--success`) = correct (`"Good"`)
  - 🟡 Amber chip (`--warning`) = needs practice (`"Needs practice"`)
  - 🔴 Red chip (`--error`) = missed (`"Missed"`)
- Words map to the `words[]` array: `{ word, correct, phoneme_mismatch }`
  - `correct: true` + no mismatch → green
  - `correct: false` + `phoneme_mismatch` present → red
  - `correct: false` + no mismatch → amber (close but not exact)
- A "Next Checkpoint →" button — **initially disabled** (grayed out) — becomes enabled when API Phase 2 feedback arrives in Phase 4

### Mock data:
```ts
const mockPhase1 = {
  session_id: "sess_demo",
  checkpoint_id: "cp_2",
  phase: 1,
  transcript: "the little explorer climbed the",
  words: [
    { word: "the", correct: true, phoneme_mismatch: null },
    { word: "little", correct: true, phoneme_mismatch: null },
    { word: "explorer", correct: false, phoneme_mismatch: "x_vs_s" },
    { word: "climbed", correct: true, phoneme_mismatch: null },
    { word: "the", correct: false, phoneme_mismatch: null },
  ],
  wpm: 62,
  hesitations: [{ after_word: "explorer", pause_ms: 850, flagged_ambiguous: true }],
  stt_source: "groq" as const,
  latency_ms: { stt: 190, acoustic: 110, scoring: 25, total_phase1: 395 },
  warnings: [],
}
```

### 🧪 How to Verify (Phase 3)
1. Complete a recording on the checkpoint screen (Phase 2) — it should transition to this feedback view.
2. ✅ You see the mascot character and a "Great job!" or "Nice try!" message.
3. ✅ The score (85%) is displayed large and prominent.
4. ✅ Three metric pills (Accuracy, Fluency, Pauses) are visible in a row.
5. ✅ The "Word by Word" section shows colored chips for each word:
   - "the" = green, "little" = green, "explorer" = red, "climbed" = green, "the" = amber
6. ✅ You do NOT see technical labels like "phoneme_mismatch: x_vs_s" — just colored chips with simple labels.
7. ✅ The "Next Checkpoint" button exists but is disabled/grayed out.
8. ✅ No sidebar/topbar. Still in the kid-facing fullscreen view.

---

## Phase 4 — Gemini Feedback: API Phase 2 UI (S4)
> **Model:** Gemini 3.1 Pro  
> **Goal:** Build the async AI feedback panel that appears 2-3 seconds after API Phase 1.  
> **No backend yet** — simulate API Phase 2 arriving after a delay with mock data.

### What to build (from design image):
- The mascot character (same purple star/cloud from Phase 3) now has a speech bubble with the AI feedback text:
  - e.g. "Try to pronounce 'explorer' a little slower. You did great on the other words!"
- A **"Let's Practice Together"** section showing the tricky word with a speaker icon:
  - The word from `practice_recommendation` is displayed large with a play/speaker button
- The "Next Checkpoint →" button is now **enabled** (active lavender color)
- This entire panel/section should **animate in** (fade + slide-up, ~300ms) after a simulated 2–3 second delay — it must feel like it arrived separately from the Phase 1 feedback

### Mock data:
```ts
const mockPhase2 = {
  session_id: "sess_demo",
  checkpoint_id: "cp_2",
  phase: 2,
  feedback_text: "Try to pronounce 'explorer' a little slower. You did great on the other words!",
  engagement_state: "confident" as const,
  comprehension_question: "What did the explorer climb?",
  practice_recommendation: "explorer",
  feedback_source: "gemini" as const,
  latency_ms: { gemini_feedback: 240, gemini_hesitation: 210 },
}
```

### 🧪 How to Verify (Phase 4)
1. After seeing the Phase 1 feedback (Phase 3), wait 2–3 seconds.
2. ✅ A new section animates in smoothly (not a sudden jump — a visible fade/slide).
3. ✅ The mascot has a speech bubble with encouraging feedback text.
4. ✅ You see a "Let's Practice Together" section with the word "explorer" displayed prominently.
5. ✅ The "Next Checkpoint →" button is now clickable (no longer grayed out).
6. ✅ Clicking "Next Checkpoint" advances you to the next checkpoint (cp_3's sentence).
7. ✅ The animation felt natural — like the AI "thought about it" before responding.

---

## Phase 5 — Progress & Rewards Screen (S5)
> **Model:** Flash 3.8  
> **Goal:** Build the checkpoint completion celebration screen.

### What to build (from design image):
- "Awesome!" headline with the mascot character celebrating
- "You completed Checkpoint 2" subtitle
- Progress indicator: "Your Progress — 2 / 5" shown as a progress bar or step dots
- **Rewards section**: "+10 Stars" and "+1 Badge" with star/badge icons
- "Continue Adventure →" button — routes back to the story map (S1)

### 🧪 How to Verify (Phase 5)
1. After advancing through a checkpoint (Phase 4's "Next Checkpoint" click), this screen should appear.
2. ✅ You see "Awesome!" or equivalent celebration text.
3. ✅ The checkpoint number is correct (e.g. "You completed Checkpoint 2").
4. ✅ Progress shows "2 / 5" with a visual bar or dots.
5. ✅ Rewards (stars, badge) are displayed with icons.
6. ✅ Clicking "Continue Adventure" takes you back to the story map.
7. ✅ The screen feels celebratory and encouraging — confetti animation or bouncing icons are a nice touch.

---

## Phase 5.5 — Student Flow Integration (S1→S2→S3→S4→S5)
> **Model:** Gemini 3.1 Pro  
> **Goal:** Wire all 5 student screens into one seamless flow with shared state.

> 🔴 This is the glue that makes the kid experience feel like one continuous journey, not 5 disconnected pages.

### What to build:
- A **session state machine** in `SpeakFlowContext` (or a new `ReadingSessionContext`) that tracks:
  ```ts
  type ReadingSessionState = {
    currentChapterId: string | null
    checkpoints: Checkpoint[]
    currentCheckpointIndex: number
    phase1Result: Phase1Response | null
    phase2Result: Phase2Response | null
    flowState: 'map' | 'checkpoint' | 'recording' | 'phase1_feedback' | 'phase2_feedback' | 'rewards' | 'complete'
    totalStars: number
  }
  ```
- The flow: **Map** → (select chapter) → **Checkpoint** → (record) → **Phase 1 Feedback** → (wait) → **Phase 2 Feedback** → (next) → **Rewards** → (continue) → **Checkpoint** (next one) → ... → **Map** (chapter complete)
- When all checkpoints in a chapter are complete, the chapter state updates to `completed` on the map
- Stars accumulate across checkpoints (e.g. +10 per checkpoint completed)
- The "back" button from any point returns to the appropriate previous screen

### 🧪 How to Verify (Phase 5.5)
> **This is the most important verification in the entire frontend. Do the full flow.**

1. Go to `http://localhost:3000/read`.
2. ✅ See the story map. Click Chapter 2 (in-progress).
3. ✅ See Checkpoint 2's target sentence. Tap the mic button.
4. ✅ Speak into your mic (or wait for mock timeout). See the recording waveform.
5. ✅ Recording stops. See the Phase 1 feedback: score, word chips, disabled "Next Checkpoint" button.
6. ✅ After 2–3 seconds, the Phase 2 AI feedback panel animates in. "Next Checkpoint" becomes active.
7. ✅ Click "Next Checkpoint". See the Rewards screen ("You completed Checkpoint 2", "+10 Stars").
8. ✅ Click "Continue Adventure". See Checkpoint 3's target sentence — NOT the story map (because there are more checkpoints in this chapter).
9. ✅ Repeat the flow for Checkpoint 3. After completing it, click "Continue Adventure" — if it's the last checkpoint, you return to the story map and Chapter 2 now shows as "Completed".
10. ✅ The star count in the top-right badge increases across checkpoints.
11. ✅ At no point during this flow did the screen feel broken, empty, or show a loading spinner that never resolved.

---

## Phase 6 — Teacher Dashboard: Overview (T1)
> **Model:** Gemini 3.1 Pro  
> **Goal:** Build the main teacher admin overview dashboard.  
> **Route:** `app/dashboard/page.tsx`  
> **Use mock data.**

> 🔴 This is the first page that uses the **sidebar + topbar layout shell** from Phase 0.5. All teacher pages share this shell.

### What to build (from design image):
- The layout shell (sidebar + topbar) wraps this page — this is the teacher experience, not the kid experience
- **Topbar** shows: "Good morning, Teacher!" greeting, today's date ("May 21, 2025" style), notification bell
- **4 stat cards** in a row:
  - Active Students: 28
  - Daily Sessions: 12
  - Class Accuracy: 72%
  - Improvement: +9 (improvement delta)
- **Class Performance (Last 7 Days)** — a recharts `LineChart` showing accuracy over time
- **Top Struggling Areas** — horizontal bar chart showing phoneme/sound error percentages:
  - Pronunciation: 43%
  - Fluency: 38%
  - Pacing: 19%

### 🧪 How to Verify (Phase 6)
1. Navigate to `http://localhost:3000/dashboard`.
2. ✅ You see the sidebar on the left with all navigation links.
3. ✅ You see the topbar with "Good morning, Teacher!" and today's date.
4. ✅ You see 4 stat cards in a row: Active Students (28), Daily Sessions (12), Accuracy (72%), Improvement (+9).
5. ✅ Below the cards: a line chart labeled "Class Performance (Last 7 Days)" — it shows a real chart, not a blank area.
6. ✅ A "Top Struggling Areas" section shows a horizontal bar chart with at least 3 items.
7. ✅ All cards use the `.speakflow-card` style (white bg, 16px radius, 1px black border).
8. ✅ Numbers and percentages use JetBrains Mono font.
9. ✅ Sidebar "Dashboard" link is highlighted/active.

---

## Phase 6.5 — Students List Page (T0)
> **Model:** Flash 3.8  
> **Goal:** Build the students roster page.  
> **Route:** `app/students/page.tsx`  
> **Use mock data.**

### What to build:
- A table or card list of students with columns: Name, Level (e.g. "Level 2"), Age/Grade, Last Active, Status (Active/Inactive chip)
- A "Search students..." input field at the top
- Each row is clickable → navigates to `app/students/[id]` (Student Progress, Phase 7)
- An "Add Student" button (primary style) — for now, can open a simple form or just show a toast

### Mock data:
```ts
const DEMO_STUDENTS = [
  { id: "stu_001", name: "Ayaan Khan", level: 2, age: 7, lastActive: "2 days ago", status: "active" },
  { id: "stu_002", name: "Fatima Ali", level: 3, age: 8, lastActive: "Today", status: "active" },
  { id: "stu_003", name: "Zain Ahmed", level: 1, age: 6, lastActive: "1 week ago", status: "inactive" },
]
```

### 🧪 How to Verify (Phase 6.5)
1. Navigate to `http://localhost:3000/students`.
2. ✅ You see a list/table of students with names, levels, and last active info.
3. ✅ A search input is visible at the top.
4. ✅ Clicking a student row navigates to `/students/[id]`.
5. ✅ Status chips show "Active" (green) or "Inactive" (gray).
6. ✅ The page uses the sidebar + topbar layout.

---

## Phase 7 — Teacher Dashboard: Student Progress (T2)
> **Model:** Flash 3.8  
> **Goal:** Build the individual student drill-down view.  
> **Route:** `app/students/[id]/page.tsx`  
> **Use mock data.**

### What to build (from design image):
- Back button ("← Back to Students") linking to `/students`
- Student header: "Ayaan Khan" · "Level 2 · 7 Years" · "Last 7 Days" filter
- **4 metric cards**: Checkpoints (8/15), Accuracy (78%), WPM (82), Improvement (+12%↑)
- **Progress Over Time** recharts `LineChart` — accuracy trend across last N sessions
- **Struggling Words** section — flagged words shown as pill chips (e.g. "explorer", "climbed", "mountain") with a "View All" link

### 🧪 How to Verify (Phase 7)
1. From the Students list, click on "Ayaan Khan".
2. ✅ You see the student's name, level, and age at the top.
3. ✅ A "← Back to Students" link is visible and works.
4. ✅ 4 metric cards show Checkpoints, Accuracy, WPM, and Improvement.
5. ✅ A line chart shows accuracy trend over time.
6. ✅ A "Struggling Words" section shows pill chips with word names.
7. ✅ Numbers use JetBrains Mono font.

---

## Phase 8 — Teacher Dashboard: Session Analysis (T3)
> **Model:** Flash 3.8  
> **Goal:** Build the single session detail view.  
> **Route:** `app/sessions/[id]/page.tsx`  
> **Use mock data.**

### What to build (from design image):
- Back button ("← Session Details")
- Session header: student name, date/time, accuracy badge (e.g. "85%" in a colored circle)
- Tab bar or sections: **Overview** · **Word Analysis** · **Pronunciation** · **Fluency** · **AI Feedback**
- **Word analysis**: the full sentence shown word by word with per-word correctness chips (reuse the chip component from Phase 3)
- **Gemini Feedback panel**: the AI feedback text displayed in a card (reuse the speech-bubble style from Phase 4 — extract it as a shared component `<AIFeedbackBubble>`)
- **Engagement**: a labeled badge — e.g. "Engagement: High" (green)
- **Hesitation Detection**: a labeled badge — "Hesitation Detected: No" (green) or "Yes — after 'explorer'" (amber)
- **Recommended Practice**: 1–3 flagged words shown as chips

### 🧪 How to Verify (Phase 8)
1. Navigate to `http://localhost:3000/sessions/sess_demo` (or however sessions are routed).
2. ✅ Student name and date are shown at the top.
3. ✅ An accuracy score (85%) is prominently displayed.
4. ✅ You see per-word colored chips matching the Phase 3 style.
5. ✅ The AI feedback text is displayed in a speech-bubble-style card.
6. ✅ "Hesitation Detected" badge shows a clear yes/no indicator.
7. ✅ Recommended practice words are shown as chips.

---

## Phase 9 — Teacher Dashboard: Checkpoint Overview (T4)
> **Model:** Flash 3.8  
> **Goal:** Build the class-wide checkpoint progress table.  
> **Route:** `app/progress/page.tsx`  
> **Use mock data.**

### What to build (from design image):
- A top-right filter: "All Students" dropdown
- A table with columns: **#** · **Checkpoint** (name) · **Avg. Accuracy** · **Completed** (e.g. "26 / 28")
- Each row has a small progress bar showing completion ratio
- Use the demo story chapter names:
  1. The Brave Little Rabbit — 98% — 25/28
  2. Climbing the Mountain — 72% — 23/28
  3. Lost in the Forest — 68% — 18/28
  4. The Hidden Treasure — 60% — 15/28
  5. The Big Celebration — 0% — 0/28

### 🧪 How to Verify (Phase 9)
1. Navigate to `http://localhost:3000/progress`.
2. ✅ A table shows 5 checkpoint rows with names, accuracy %, and completion counts.
3. ✅ Each row has a visible progress bar.
4. ✅ The last row ("The Big Celebration") shows 0% and 0/28 — clearly indicating no one has reached it yet.
5. ✅ An "All Students" dropdown filter is visible (it doesn't need to filter yet — just be present).

---

## Phase 10 — Integration: Create API Layer & Wire Context
> **Model:** Gemini 3.1 Pro  
> **Goal:** Build the real API client and session context for connecting to the backend.  
> **Prerequisite:** Backend Phase A (scaffold + health endpoint) should be running, but you can also test against mocked responses.

> 🔴 This is where the frontend transitions from mock data to real backend communication.

- [ ] **10.1** Finalize `lib/api.ts`:
  - Implement `resolveApiBase()`: calls `GET /api/v1/health`, caches result for 5s, returns `{ baseUrl, mode }` 
  - Implement: `createSession()`, `analyzeCheckpoint()` (multipart/form-data with `Blob`), `fetchSession()`, `fetchStudentDashboard()`, `triggerSync()`, `fetchFeedback()` (polling)
  - All functions use the cached `baseUrl` and handle the error envelope
- [ ] **10.2** Expand `context/SpeakFlowContext.tsx`:
  - Add `startNewSession(studentId, storyId, language)` → calls `createSession()`
  - Add `recordAndAnalyzeCheckpoint()` → uses existing MediaRecorder to capture audio as `Blob`, sends to `analyzeCheckpoint()` (NOT base64 — raw Blob as multipart)
  - Apply API Phase 1 state immediately on response
  - Add WebSocket connection to `/ws/sessions/{id}` for API Phase 2 — apply feedback state when it arrives, must NOT block Phase 1 UI
  - Add polling fallback: if WebSocket fails, poll `fetchFeedback()` every 2s until Phase 2 data arrives
  - Add `pipelineStatus` object: `{ stt: 'idle'|'running'|'done', acoustic: ..., feedback: ..., hesitation: ... }` with latency_ms values from responses
- [ ] **10.3** Wire the Checkpoint Screen (Phase 2) to `recordAndAnalyzeCheckpoint()` — replace the mock timeout with the real recording→submit→response flow
- [ ] **10.4** Surface API `warnings[]` as toast notifications via `addNotification()`

### 🧪 How to Verify (Phase 10)
1. Start the backend: `uvicorn main:app` (must be running on localhost).
2. Start the frontend: `npm run dev`.
3. Navigate to the Reading Buddy flow and start a session.
4. ✅ After recording, you see API Phase 1 results appear quickly (< 1 second perceived).
5. ✅ 2–3 seconds later, API Phase 2 feedback animates in — separately, not at the same time.
6. ✅ Open browser DevTools → Network tab: you see a `POST /api/v1/sessions` call and a `POST /api/v1/sessions/{id}/analyze` call with `multipart/form-data` content type.
7. ✅ You see a WebSocket connection in the Network tab (or polling requests if WS failed).
8. Run `npx tsc --noEmit` — no TypeScript errors.
9. ✅ If the backend is offline, the frontend doesn't crash — it shows an error toast.

---

## Phase 11 — Settings & Pipeline Monitor Pages
> **Model:** Flash 3.8  
> **Goal:** Build the Settings page and Pipeline Monitor page with accurate information.

- [ ] **11.1** Create `app/settings/page.tsx`:
  - **Backend Status** card: shows mode from `GET /health` ("Online" / "Offline" / "Unreachable"), `groq_reachable`, `gemini_reachable` as green/red indicators
  - **Pipeline Architecture** section: accurate description of the real pipeline: "STT via Groq Whisper API (online) or local quantized Whisper (offline) → Acoustic analysis via librosa → Feedback via Gemini 3.5 Flash-Lite"
  - **Privacy note**: "The hesitation judgment feature sends a short audio clip to Google's API for analysis. All other audio processing is local."
  - **Sync Status** section: unsynced session count + "Sync Now" button (calls `triggerSync()`)
- [ ] **11.2** Create `app/pipeline/page.tsx` (Pipeline Monitor):
  - 4 pipeline stage cards: **STT**, **Acoustic Analysis**, **Gemini Feedback**, **Gemini Hesitation**
  - Each card shows: status (`idle`/`running`/`done`/`error`), latency in ms (from `pipelineStatus` in context)
  - A live log panel (right side): appends log lines as stages complete during a live session (e.g. "STT complete via groq — 190ms")
  - Shows empty/idle state when no session has run

### 🧪 How to Verify (Phase 11)
1. Navigate to `http://localhost:3000/settings`.
2. ✅ You see a "Backend Status" card — if backend is running, it shows "Online" with green indicators. If not, it shows "Unreachable" in red.
3. ✅ The pipeline description mentions Groq, librosa, and Gemini — NOT Gemma or "5 agents".
4. ✅ The privacy note about audio being sent to Google is present.
5. ✅ A "Sync Now" button is visible (may show "0 sessions to sync" if nothing is queued).
6. Navigate to `http://localhost:3000/pipeline`.
7. ✅ You see 4 pipeline stage cards, all showing "Idle" initially.
8. ✅ Run a reading session in another tab → come back to Pipeline Monitor → stage statuses and latency numbers have updated.

---

## Phase 12 — Wire Real Data to Teacher Dashboard
> **Model:** Gemini 3.1 Pro  
> **Goal:** Replace all mock data in teacher pages with real API calls.  
> **Prerequisite:** Backend Phase I (REST API layer complete).

- [ ] **12.1** Dashboard (T1): Replace mock stat cards with data from `fetchStudentDashboard()` or a new class-level endpoint
- [ ] **12.2** Student Progress (T2): Feed the line chart and struggling words from real API data
- [ ] **12.3** Session Analysis (T3): Load real session data on page load
- [ ] **12.4** Checkpoint Overview (T4): Build a per-sound error-rate heatmap (phoneme labels on one axis, error frequency as color intensity) alongside the checkpoint table
- [ ] **12.5** Sessions list (`app/sessions/page.tsx`): show real session durations, make rows clickable to navigate to detail view
- [ ] **12.6** Add `stt_source` and `feedback_source` pill badges on session results: "Groq" (lavender) vs. "Offline" (amber), "Gemini" (lavender) vs. "Template" (amber)

### 🧪 How to Verify (Phase 12)
1. Run several reading sessions to generate real data.
2. Navigate to the Dashboard.
3. ✅ Stat card numbers change based on actual session data — they're no longer hardcoded.
4. ✅ The line chart reflects real accuracy trends.
5. Navigate to a student's progress page.
6. ✅ Struggling words match words that were actually flagged during sessions.
7. Navigate to a session detail.
8. ✅ Per-word chips reflect the actual recording analysis, not mock data.
9. ✅ You see `stt_source` and `feedback_source` badges — they show "Groq" or "Offline" depending on the session.
10. Search the codebase: `grep -r "MOCK_SESSION_DATA" app/` returns **no results**.

---

## Phase 13 — Language Support: Urdu Rendering
> **Model:** Gemini 3.1 Pro  
> **Goal:** Add language selector and Urdu text rendering.

- [ ] **13.1** Add language selector (`English` / `اردو`) to the session-start flow — before the first checkpoint, the student or teacher picks the language
- [ ] **13.2** Load Noto Nastaliq Urdu font via `next/font/google` (or direct Google Fonts import)
- [ ] **13.3** Apply font + `dir="rtl"` **only** to target-sentence display and live-transcript blocks when `language === "ur"` — all other chrome (sidebar, topbar, buttons, labels) must remain LTR / DM Sans
- [ ] **13.4** Verify phoneme pair display for Urdu: ق/ک, ع, ح, خ render correctly in word chip components

### 🧪 How to Verify (Phase 13)
1. Start a new reading session and select "اردو" (Urdu) as the language.
2. ✅ The target sentence on the checkpoint screen is displayed in Urdu script using the Noto Nastaliq font.
3. ✅ The Urdu text flows right-to-left.
4. ✅ The rest of the screen (buttons, labels, navigation) is still left-to-right and uses DM Sans.
5. ✅ Word chips in the feedback view show Urdu characters correctly — including ق, ک, ع, ح, خ.
6. ✅ Switching back to English renders everything normally — no RTL artifacts remaining.

---

## Phase 14 — Parent WhatsApp Preview Card
> **Model:** Flash 3.8  
> **Goal:** Static parent update example — NOT a live-send feature.

- [ ] **14.1** Create `components/dashboard/ParentUpdateCard.tsx`:
  - Styled as a WhatsApp-like message bubble (green header bar, white message area, timestamp)
  - Contains one hardcoded example message in Urdu
  - Labeled "Example Parent Update" — NO send button, NO input field
- [ ] **14.2** Place on the Students detail page (`app/students/[id]`) as a sidebar card or below the struggling words section
- [ ] **14.3** Render Urdu text RTL using Noto Nastaliq (reuse from Phase 13)

### 🧪 How to Verify (Phase 14)
1. Navigate to a student's detail page (`/students/stu_001`).
2. ✅ You see a WhatsApp-style message bubble card.
3. ✅ The card is labeled "Example Parent Update" or similar.
4. ✅ The Urdu text renders correctly in right-to-left direction.
5. ✅ There is NO "Send" button — nothing implies this actually sends a message.

---

## Phase 15 — Full Frontend Integration Pass & UI Freeze
> **Model:** Kimi K3 (for codebase-wide analysis) + Gemini 3.1 Pro (for fixes)  
> **Goal:** Run the entire app end-to-end, fix everything, freeze scope.

- [ ] **15.1** Full flow test: teacher console AND kid Reading Buddy — run start to finish against real backend, in both online and offline mode, in both English and Urdu
- [ ] **15.2** Codebase grep — confirm NONE of these strings appear anywhere in `app/`, `lib/`, or `components/`:
  - `MOCK_SESSION_DATA` (should be deleted)
  - `runPipeline` (old API function)
  - `diagnosis` (old response shape)
  - `gemma` (old model reference)
  - `127.0.0.1:8000` (hardcoded URL)
  - `agentsAtWork` (old component)
- [ ] **15.3** Every API warning/error surfaces as a toast — kill the backend mid-session and confirm you see an error toast, not a white screen
- [ ] **15.4** No console errors in browser DevTools during a normal session flow
- [ ] **15.5** All tap targets on kid-facing screens are ≥ 48px (use DevTools Inspect to measure)
- [ ] **15.6** Reports page (`app/reports/page.tsx`) — confirm it exists as at least a placeholder ("Reports — Coming Soon") with the sidebar layout. This is ROADMAP-ONLY for now.

### 🧪 How to Verify (Phase 15)
> **Run through this entire checklist. Every item must pass.**

1. ✅ Open http://localhost:3000/read → complete a full 5-checkpoint chapter in English → all screens transition smoothly → chapter shows "Completed" on the map.
2. ✅ Start a new session in Urdu → target text is RTL → word chips show Urdu characters → feedback text is in Urdu.
3. ✅ Open http://localhost:3000/dashboard → all cards show data → charts render → sidebar navigation works to every page.
4. ✅ Go to Settings → it says "Online" when backend is up, "Unreachable" when backend is killed.
5. ✅ Go to Pipeline Monitor → run a session → stage statuses update live.
6. ✅ Kill the backend mid-recording → you see an error toast, NOT a blank screen or infinite spinner.
7. ✅ Run `npx tsc --noEmit` — 0 errors.
8. ✅ Run the grep commands from 15.2 — all return 0 results.
9. ✅ Open DevTools console — 0 errors during a normal session.
10. ✅ Every page in the sidebar loads without error.

**Scope is frozen after this phase passes. Anything not verified here does NOT go in the pitch.**

---

---

# ⚙️ BACKEND BUILD PHASES (A–K)
> **Assigned to:** Backend developer  
> **Can start in parallel with frontend.** No cross-dependency until Frontend Phase 10, which requires Backend Phases A and I to be running.  
> **Reference:** `Context/speakflow_roadmap_architecture.md` contains the full architecture diagram, API contract details, and extended implementation notes.

---

## Phase A — Project Scaffold & Config
> **Model:** Flash 3.8  
> **Reference:** `Context/speakflow_roadmap_architecture.md`, Part 4, Prompt 1

- [ ] **A.1** Create folder structure:
  ```
  /app
    /api          (route handlers)
    /core         (config.py, network.py)
    /services
      /stt        (groq_whisper.py, local_whisper.py)
      /acoustic   (feature_extractor.py, scorer.py)
      /dictionary (reference_dictionary.py)
      /reasoning  (gemini_feedback.py, hesitation.py)
    /storage      (database.py, sync.py)
  main.py
  .env.example    (GROQ_API_KEY, GEMINI_API_KEY, GEMINI_API_KEY_DEMO, ENV=dev|demo)
  requirements.txt
  ```
- [ ] **A.2** `app/core/config.py` — single `Settings` object loading from `.env` via `python-dotenv`. **No other file reads `os.environ` directly.**
- [ ] **A.3** `GET /api/v1/health` endpoint returning `{ mode, groq_reachable, gemini_reachable, server_time }` (reachability stubbed for now)
- [ ] **A.4** `requirements.txt`: `fastapi`, `uvicorn`, `python-dotenv`, `librosa`, `groq`, `google-generativeai`, `faster-whisper`, `aiosqlite`

### 🧪 How to Verify (Phase A)
1. Run `pip install -r requirements.txt` — no errors.
2. Run `uvicorn main:app --reload` — server boots without errors.
3. Run `curl http://localhost:8000/api/v1/health` (or open in browser).
4. ✅ You get a 200 response with JSON: `{ "mode": "online", "groq_reachable": null, "gemini_reachable": null, "server_time": "2026-..." }`.
5. ✅ The folder structure matches the layout above.

---

## Phase B — Groq Whisper Integration (Online STT)
> **Model:** Flash 3.8  
> **Reference:** Prompt 2

- [ ] **B.1** `groq_whisper(audio_bytes) -> TranscriptResult` — calls Groq API with 600ms timeout
- [ ] **B.2** `TranscriptResult`: `{ text: str, words: [{ word, start_ms, end_ms }] }`
- [ ] **B.3** Test script: `scripts/test_groq.py` — send 3 sample WAV files, print transcript + timestamps

### 🧪 How to Verify (Phase B)
1. Place 3 WAV recordings in `test_audio/` (record yourself saying the demo sentences).
2. Run `python scripts/test_groq.py`.
3. ✅ Each recording prints a transcript that roughly matches what you said.
4. ✅ Each word entry has `start_ms` < `end_ms`.
5. ✅ Timestamps are monotonically increasing (each word starts after the previous one ends).

---

## Phase C — Librosa Acoustic Engine
> **Model:** Gemini 3.1 Pro  
> **Reference:** Prompt 3

- [ ] **C.1** `extract_features(audio_bytes, word_timespan) -> FeatureVector` — pitch contour, F1/F2 formants, ZCR, spectral energy
- [ ] **C.2** `score_against_reference(feature_vector, reference_vector) -> float` (0–100 composite)
- [ ] **C.3** Correctness threshold: `CORRECT_THRESHOLD = 70` in `app/core/config.py` — **never hardcoded inline**
- [ ] **C.4** Test script: `scripts/test_acoustic.py`

### 🧪 How to Verify (Phase C)
1. Record 3 correct pronunciations and 3 deliberate mispronunciations of the same words.
2. Run `python scripts/test_acoustic.py`.
3. ✅ Correct recordings score measurably higher than wrong ones (e.g. correct: 75–90, wrong: 30–55).
4. ✅ No `NaN` or `0.0` values in the feature vectors.
5. ✅ The gap between correct and incorrect scores is at least 15 points for each word.

---

## Phase D — Phoneme Reference Dictionary
> **Model:** Flash 3.8  
> **Reference:** Prompt 4

- [ ] **D.1** `ReferenceDictionary` — loads `/data/phoneme_dictionary.json`
- [ ] **D.2** `manual_overrides.json` — overrides for high-stakes Urdu pairs (ق/ک, ع, ح, خ)
- [ ] **D.3** `scripts/build_dictionary.py` — documents expected JSON shape
- [ ] **D.4** Wire into `score_against_reference`: `lookup(word, language) -> reference FeatureVector`

### 🧪 How to Verify (Phase D)
1. Run `python -c "from app.services.dictionary.reference_dictionary import ReferenceDictionary; d = ReferenceDictionary(); print(d.lookup('rabbit', 'en'))"`.
2. ✅ Returns a FeatureVector (not None, not an error).
3. ✅ Repeat for 2 more English words and 2 Urdu words — all return vectors.
4. ✅ An Urdu override word returns the override vector, not the auto-generated one.

---

## Phase E — Gemini 3.5 Flash-Lite Integration
> **Model:** Gemini 3.1 Pro  
> **Reference:** Prompt 5  
> ⚠️ Verify the exact model ID is on the free tier before committing.

- [ ] **E.1** `generate_feedback(mismatch_data: dict) -> str` — text-only Gemini call; 1.5s soft timeout
- [ ] **E.2** `judge_hesitation(audio_bytes, pause_context: dict) -> "nervous" | "not_knowing"` — multimodal; only fires when `pause_ms > HESITATION_THRESHOLD` (400ms)
- [ ] **E.3** Both raise specific exception types (not bare `Exception`)
- [ ] **E.4** Use `GEMINI_API_KEY` for dev; `GEMINI_API_KEY_DEMO` for demo day

### 🧪 How to Verify (Phase E)
1. Run `python scripts/test_gemini_feedback.py` with 5 sample mismatch inputs.
2. ✅ Each produces coherent, encouraging, age-appropriate feedback text (read them yourself — do they sound like something you'd say to a 7-year-old?).
3. ✅ Run with 3 pause recordings → each gets classified as "nervous" or "not_knowing".
4. ✅ Set `GEMINI_API_KEY` to a fake value → the function raises a specific `GeminiUnavailableError` (or similar), NOT a generic `Exception`.

---

## Phase F — Local Whisper Fallback & Network Detection
> **Model:** Flash 3.8  
> **Reference:** Prompt 6

- [ ] **F.1** `local_whisper(audio_bytes) -> TranscriptResult` — same shape as Groq; INT8 model via `faster-whisper`; **loaded once at startup**
- [ ] **F.2** `network_available() -> bool` — cheap reachability probe (NOT Groq/Gemini); cached 5s TTL

### 🧪 How to Verify (Phase F)
1. Run `python scripts/test_local_whisper.py` with the same 3 WAV files from Phase B.
2. ✅ Each produces a transcript (accuracy may be lower than Groq — that's expected and fine).
3. ✅ Return shape matches `TranscriptResult` exactly (same fields as Groq output).
4. Disable your WiFi/Ethernet adapter manually.
5. ✅ `network_available()` returns `False` within 5 seconds.
6. Re-enable network → returns `True` within 5 seconds.

---

## Phase G — WebSocket Local Mesh
> **Model:** Gemini 3.1 Pro  
> **Reference:** Prompt 7

- [ ] **G.1** WebSocket route: `/ws/sessions/{session_id}`
- [ ] **G.2** Accepts audio chunks → runs pipeline → pushes Phase 1, then Phase 2 as two JSON messages
- [ ] **G.3** CLI flag `--local-host` binds server to LAN IP

### 🧪 How to Verify (Phase G)
1. Start the server: `uvicorn main:app`.
2. Use a WebSocket test tool (e.g. `wscat -c ws://localhost:8000/ws/sessions/test_session`).
3. Send a base64-encoded audio chunk.
4. ✅ You receive exactly 2 JSON messages back — the first is Phase 1, the second is Phase 2.
5. ✅ Phase 1 message has `"phase": 1` and Phase 2 has `"phase": 2`.
6. Start with `--local-host` flag.
7. ✅ Server binds to your LAN IP (e.g. `192.168.x.x`) instead of `127.0.0.1`.

---

## Phase H — Cloud Sync-on-Reconnect
> **Model:** Flash 3.8  
> **Reference:** Prompt 8

- [ ] **H.1** SQLite: `synced BOOLEAN` + `local_created_at TIMESTAMP` on session results
- [ ] **H.2** Offline writes → `synced = False`
- [ ] **H.3** Background thread: checks `network_available()` every 30s; on `False→True` → syncs
- [ ] **H.4** `POST /api/v1/sync` → manual trigger → `{ synced_count, failed_count }`

### 🧪 How to Verify (Phase H)
1. Disable your network → run a session → check the SQLite DB.
2. ✅ The session record has `synced = 0` (false).
3. Re-enable your network → wait up to 30 seconds.
4. ✅ Check the DB again — `synced` is now `1` (true).
5. Run `curl -X POST http://localhost:8000/api/v1/sync`.
6. ✅ Response: `{ "synced_count": 0, "failed_count": 0 }` (nothing queued).

---

## Phase I — Full REST API Layer
> **Model:** Flash 3.8  
> **Reference:** Prompt 9

- [ ] **I.1** `POST /api/v1/sessions` → 201 with session + checkpoints
- [ ] **I.2** `POST /api/v1/sessions/{id}/analyze` → multipart; Phase 1 immediate, Phase 2 via WS
- [ ] **I.3** `GET /api/v1/sessions/{id}` → session summary
- [ ] **I.4** `GET /api/v1/sessions/{id}/feedback/{checkpoint_id}` → polling for Phase 2
- [ ] **I.5** `GET /api/v1/students/{id}/dashboard?range=session|week|all`
- [ ] **I.6** All errors use the shared envelope with `code` enum

### 🧪 How to Verify (Phase I)
1. Run through this curl sequence:
   ```bash
   # Create session
   curl -X POST http://localhost:8000/api/v1/sessions \
     -H "Content-Type: application/json" \
     -d '{"student_id":"stu_001","story_id":"story_forest","language":"en"}'
   # → Should return 201 with session_id and checkpoints list

   # Analyze checkpoint (with a real audio file)
   curl -X POST http://localhost:8000/api/v1/sessions/{SESSION_ID}/analyze \
     -F "audio=@test_audio/sample_1.wav" \
     -F "checkpoint_id=cp_1"
   # → Should return Phase 1 JSON

   # Get session summary
   curl http://localhost:8000/api/v1/sessions/{SESSION_ID}
   # → Should return session progress

   # Get dashboard
   curl http://localhost:8000/api/v1/students/stu_001/dashboard?range=all
   # → Should return aggregated metrics
   ```
2. ✅ Every response matches the API contract shapes exactly.
3. ✅ Send a request with missing `checkpoint_id` → error response with `code: "VALIDATION_ERROR"`.
4. ✅ Request a non-existent session → `code: "SESSION_NOT_FOUND"`.

---

## Phase J — Fallbacks, Latency Logging & System Hardening
> **Model:** Gemini 3.1 Pro  
> **Reference:** Prompt 10

- [ ] **J.1** `get_transcript(audio)` wrapper: tries Groq → falls back to local Whisper → tags `stt_source`
- [ ] **J.2** `get_feedback(mismatch_data)` wrapper: tries Gemini → falls back to template bank → tags `feedback_source`
- [ ] **J.3** Replace ALL direct calls with wrapper calls — no other code has try/except for these
- [ ] **J.4** Per-request latency logging to a queryable log table
- [ ] **J.5** `GET /api/v1/health` now runs real reachability checks (not stubbed)

### 🧪 How to Verify (Phase J)
1. Set `GROQ_API_KEY` to a garbage value in `.env` → restart server.
2. Run a session via curl or the frontend.
3. ✅ Response contains `"stt_source": "local_fallback"` — it didn't crash.
4. ✅ Server logs show a fallback event: `"groq_fallback"` with a reason.
5. Set `GEMINI_API_KEY` to a garbage value → restart.
6. Run another session.
7. ✅ Response contains `"feedback_source": "template_fallback"`.
8. Restore real keys → run a full session.
9. ✅ Check the latency log table: it has entries for `stt`, `acoustic`, `scoring`, `response_assembly`, `gemini_feedback`.
10. ✅ `total_phase1` is under 800ms.

---

## Phase K — Backend Integration Pass & Demo Freeze
> **Model:** Gemini 3.1 Pro  
> **Final backend gate.**

- [ ] **K.1** Full pipeline end-to-end: audio → Phase 1 JSON → Phase 2 via WebSocket — both English and Urdu
- [ ] **K.2** Confusion matrix calibration: run the test recordings → any word that isn't stable gets **dropped from the demo**
- [ ] **K.3** Switch to `GEMINI_API_KEY_DEMO` for demo day
- [ ] **K.4** Confirm audio is never persisted (grep for file write operations on audio variables)
- [ ] **K.5** Document that Phase E.2 (hesitation judgment) sends audio to Google's API

### 🧪 How to Verify (Phase K)
1. Record yourself reading all 5 demo sentences correctly.
2. Run each through the full pipeline.
3. ✅ Every correct reading scores ≥ 70 (the `CORRECT_THRESHOLD`).
4. Record deliberate mispronunciations of the same sentences.
5. ✅ Every mispronunciation scores below 70.
6. ✅ Feedback text for mispronunciations is encouraging and mentions the specific word.
7. Search the codebase: `grep -r "open.*wb\|write.*audio\|save.*wav" app/` — ✅ returns no results (no audio persistence).
8. ✅ Check `.env` has `GEMINI_API_KEY_DEMO` set and different from `GEMINI_API_KEY`.

---

## ✅ PHASE X — Final Verification Checklist (Both Teams)

> **Model:** Opus 4.6 (for the review) or manually by the team lead  
> Mark `[x]` only after actually running the check — not by assumption.

- [ ] Frontend builds with no TypeScript errors (`npx tsc --noEmit`)
- [ ] Backend starts with no errors (`uvicorn main:app`)
- [ ] No `MOCK_SESSION_DATA`, `runPipeline`, `diagnosis`, `127.0.0.1:8000` remaining in frontend codebase
- [ ] No page references "Gemma", "Google API Key Pool", or claims audio never leaves device
- [ ] Backend: `POST /sessions/{id}/analyze` API Phase 1 latency < 800ms
- [ ] Full round-trip (online): kid reads → Phase 1 → Phase 2 → checkpoint advances → chapter completes
- [ ] Full round-trip (offline): local Whisper + template fallback + `local_fallback` badges visible
- [ ] Urdu session: correct RTL rendering, correct font, phoneme pairs display correctly
- [ ] Privacy: raw audio is never written to disk (grep confirmation)
- [ ] Every sidebar link loads a page (no 404s)
- [ ] Reports page shows at least a placeholder

```
✅ PHASE X COMPLETE
- Frontend build: [ ] Pass
- Backend build: [ ] Pass
- Full integration: [ ] Pass
- Date: ___________
```

---

*This roadmap was generated on 2026-09-02 and updated with Opus audit fixes. Based on analysis of `assets/speakflow-ui-guide.png`, `Context/speakflow_explanation.md`, `Context/speakflow_roadmap_architecture.md`, `Context/speakflow_team_briefing.md`, and `Context/speakflow_ui_analysis_roadmap.md`.*
