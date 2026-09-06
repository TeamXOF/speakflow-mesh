# SPEAKFLOW AI — MASTER HACKATHON BLUEPRINT
> **Rebuild from scratch in 3 hours using this file alone.**
> Last updated: 2026-07-12 · Hackathon: Build with Gemma, NUTECH Islamabad · July 15, 2026

---

## 🧭 QUICK CONTEXT

| Field | Value |
|---|---|
| **Project** | SpeakFlow AI — AI reading companion for children |
| **Tagline** | Every reader. Every day. |
| **Hackathon** | Build with Gemma: NUTECH Islamabad |
| **Track** | Education AI |
| **Prize pool** | $1,000 USD |
| **Deadline** | July 15, 2026 |
| **Team size** | 4 people |
| **Demo format** | Live on local machine |
| **Repo location** | `d:\[Project]\SpeakFlow\` |

---

## ⚙️ TECH STACK (LOCKED)

### Frontend
```
Framework:     Next.js 14 (App Router)
Styling:       Tailwind CSS v3
Charts:        Recharts
Icons:         lucide-react
Audio:         Browser MediaRecorder API (built-in)
Language:      TypeScript
Package mgr:   npm
```

### Backend
```
Framework:  FastAPI (Python 3.11+)
AI model:   Gemma 4 via Google AI Studio API
Async:      asyncio (for parallel agent execution)
Audio DSP:  librosa, webrtcvad, numpy
STT:        openai-whisper (tiny model for speed)
Database:   SQLite via sqlite3 (built-in Python)
CORS:       fastapi.middleware.cors
```

### Environment Variables
```bash
# .env.local (frontend - Next.js)
NEXT_PUBLIC_API_URL=http://localhost:8000

# .env (backend - FastAPI)
GOOGLE_API_KEYS=<key1>,<key2>,<key3> # Comma-separated for rate limit rotation
DATABASE_URL=./speakflow.db
WHISPER_MODEL=tiny
```

> ⚠️ API keys go in `.env` only. Add `.env` to `.gitignore` immediately.

---

## 📁 COMPLETE FILE STRUCTURE

```
SpeakFlow/
├── frontend/                        # Next.js app
│   ├── app/
│   │   ├── layout.tsx               # Root layout with sidebar
│   │   ├── page.tsx                 # Redirects to /dashboard
│   │   ├── dashboard/page.tsx       # MAIN PAGE — build first
│   │   ├── agents/page.tsx          # Pipeline visualization
│   │   └── sessions/page.tsx        # Session history
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   └── Topbar.tsx
│   │   ├── dashboard/
│   │   │   ├── LiveReadingCard.tsx
│   │   │   ├── SessionSummaryCard.tsx
│   │   │   ├── AIDiagnosisCard.tsx
│   │   │   ├── AgentsAtWorkCard.tsx
│   │   │   ├── PracticeCard.tsx
│   │   │   └── ProgressChart.tsx
│   │   └── shared/
│   │       ├── StatusBadge.tsx
│   │       └── RadialScore.tsx
│   ├── lib/
│   │   ├── api.ts
│   │   ├── types.ts
│   │   └── mockData.ts
│   └── package.json
│
├── backend/                         # FastAPI app
│   ├── main.py
│   ├── agents/
│   │   ├── orchestrator.py
│   │   ├── phonetic_agent.py
│   │   ├── difficulty_agent.py
│   │   ├── engagement_agent.py
│   │   ├── practice_agent.py
│   │   └── progress_agent.py
│   ├── database/
│   │   ├── schema.py
│   │   ├── models.py
│   │   └── queries.py
│   ├── routers/
│   │   ├── sessions.py
│   │   ├── students.py
│   │   └── pipeline.py
│   ├── requirements.txt
│   └── .env                         # GEMMA_API_KEY here (gitignored)
│
├── SPEAKFLOW_BLUEPRINT.md           # THIS FILE
├── SpeakFlow_AI_Project_Specification.md
├── Dashboard.jpeg                   # Design reference — pixel-perfect target
└── Flowdiagram.jfif                 # Architecture reference
```

---

## 🎨 DESIGN SYSTEM (EXACT VALUES FROM DASHBOARD.JPEG)

```css
/* globals.css */
:root {
  --bg-base:              #FAF7F2;   /* warm cream — page background */
  --bg-card:              #FFFFFF;   /* all cards */

  --accent-primary:       #C9BFF0;   /* buttons, active nav */
  --accent-primary-dark:  #A89EDB;   /* hover states */
  --accent-primary-bg:    #F0EDFC;   /* light purple tint backgrounds */

  --accent-secondary:     #F5C6D8;   /* stars, streaks */
  --accent-secondary-bg:  #FDF0F5;   /* pink tint backgrounds */

  --text-primary:         #1A1A1A;
  --text-secondary:       #6B7280;
  --text-muted:           #9CA3AF;

  --status-complete:      #22C55E;
  --status-inprogress:    #A89EDB;
  --status-pending:       #D1D5DB;
  --status-good:          #22C55E;
  --status-needs:         #F87171;
  --status-anxious:       #FB923C;

  --border:               #1A1A1A;   /* thin black border on ALL cards */
  --border-radius:        16px;
  --border-radius-sm:     8px;
}
```

### Fonts
```
Google Fonts: DM Sans (400,500,600,700,800) — all text/headings
              JetBrains Mono (400,500) — section labels in small caps
URL: https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap
```

### Dashboard Grid Layout
```
Row 1: LiveReadingCard (col-span-7) | SessionSummaryCard (col-span-5)
Row 2: AIDiagnosisCard (col-span-6) | AgentsAtWorkCard (col-span-6)
Row 3: PracticeCard (col-span-6)    | ProgressChart (col-span-6)
```

### Sidebar Structure
```
Top:    Logo (SpeakFlow AI + tagline)
Nav:    Dashboard | Students | Reading Sessions | AI Agents | Practice Center | Reports | Progress Tracker | Settings
        Active: bg #F0EDFC, text #A89EDB, 3px left border #A89EDB
Middle: "CURRENT STUDENT" card — avatar initials circle, name, grade+level
        Encouragement card — pink tint bg, quote icon, highlighted stat (pink text)
Bottom: Log out button
```

---

## 🧠 GEMMA AGENT SYSTEM PROMPTS (COMPLETE — COPY-PASTE)

**Model:** `gemma-4-9b-it` · **Auth:** `GEMMA_API_KEY` env var
**Rule:** All agents return ONLY valid JSON. No markdown. No explanation text.

### Agent 1 — Phonetic Diagnostician
```python
PHONETIC_SYSTEM_PROMPT = """
You are a pediatric phonetic diagnostician. Analyze word-level timing and pitch data
from a child reading aloud. Identify exactly which phonemes cause difficulty.

Input fields: words_spoken (list: word, timing_ms, pitch_deviation, accuracy_flag),
              target_sentence, child_grade (1-6)

Return ONLY this JSON structure:
{
  "struggling_phonemes": ["br blend", "long-o", "th"],
  "struggling_words": ["specific words that caused hesitation"],
  "confidence": 0.85,
  "severity": "mild",
  "reasoning": "One sentence plain English for a teacher."
}
"""
```

### Agent 2 — Difficulty Classifier
```python
DIFFICULTY_SYSTEM_PROMPT = """
You are a reading difficulty classifier. Determine the PRIMARY category of a child's struggle.
Categories: PHONETIC (sounds) | COGNITIVE (word recognition) | FLUENCY (pacing) | MIXED

Input fields: phonetic_result (from Agent 1), wpm (words per minute),
              pause_count (pauses over 800ms), repetition_count, grade
Age-expected WPM: grade1=60, grade2=90, grade3=110, grade4=140

Return ONLY this JSON:
{
  "category": "PHONETIC",
  "primary_issue": "One sentence describing main struggle.",
  "secondary_issue": null,
  "reasoning": "Brief plain language for teacher."
}
"""
```

### Agent 3 — Engagement Monitor
```python
ENGAGEMENT_SYSTEM_PROMPT = """
You are a child engagement and emotional state monitor. Detect frustration or anxiety
from acoustic signals of a child reading aloud.

Input fields: pitch_variance (float), pause_durations (list of ms values),
              hesitation_markers (count of um/uh/re-reads),
              session_duration_seconds, accuracy_trend (improving|declining|stable)

Return ONLY this JSON:
{
  "emotional_state": "slightly_anxious",
  "frustration_signal": 0.4,
  "engagement_level": 0.7,
  "suggested_tone": "encouraging",
  "teacher_note": "One sentence about child's current emotional state."
}
"""
```

### Agent 4 — Practice Generator
```python
PRACTICE_SYSTEM_PROMPT = """
You are a personalized reading practice generator for children.
Create 5 targeted practice sentences based on diagnosis results.

Input fields: phonetic_result, difficulty_category, emotional_state,
              suggested_tone, grade (1-6), struggling_words

Rules:
- Exactly 5 sentences
- Each must contain the struggling phoneme or word pattern
- Grade-appropriate vocabulary
- If frustrated/slightly_anxious: shorter sentences with familiar words
- Use engaging topics: animals, adventure, colors, everyday scenarios

Return ONLY this JSON:
{
  "focus_area": "Blends (tr, dr, br)",
  "sentences": [
    {"text": "The brave driver drove through the cold dark street.", "target_phoneme": "dr blend", "difficulty": "medium"},
    {"text": "...", "target_phoneme": "...", "difficulty": "easy"}
  ],
  "encouraging_note": "Warm, specific 1-2 sentence encouragement for the child.",
  "teacher_tip": "One actionable sentence for the teacher."
}
"""
```

### Agent 5 — Progress Tracker
```python
PROGRESS_SYSTEM_PROMPT = """
You are a reading progress analyst. Write a plain-language progress report for teachers
and parents based on session history and today's diagnosis.

Input fields: student_name, grade, sessions (list: date/accuracy/wpm/overall_score/focus_area),
              today_diagnosis (combined agents 1-3 output), session_count

Return ONLY this JSON:
{
  "trend": "improving",
  "improvement_percentage": 18.0,
  "highlights": ["Accuracy improved from 72% to 85% over 7 sessions.", "..."],
  "areas_to_watch": ["Blends (tr, dr, br) still causing hesitation."],
  "recommendation": "One specific actionable sentence for teacher.",
  "report_text": "3-4 sentence plain language report suitable for a parent newsletter."
}
"""
```

---

## 🔄 ORCHESTRATOR (Complete Pattern)

```python
# backend/agents/orchestrator.py
import asyncio, json, os
import google.generativeai as genai
from .phonetic_agent import PHONETIC_SYSTEM_PROMPT
from .difficulty_agent import DIFFICULTY_SYSTEM_PROMPT
from .engagement_agent import ENGAGEMENT_SYSTEM_PROMPT
from .practice_agent import PRACTICE_SYSTEM_PROMPT
from .progress_agent import PROGRESS_SYSTEM_PROMPT

# Setup API Key Pool for Rate Limits
api_keys_str = os.getenv("GOOGLE_API_KEYS", "")
API_KEYS = [k.strip() for k in api_keys_str.split(",") if k.strip()]
current_key_idx = 0
key_lock = asyncio.Lock()
if API_KEYS: genai.configure(api_key=API_KEYS[current_key_idx])

async def call_gemma(system_prompt: str, user_data: dict) -> dict:
    global current_key_idx
    model = genai.GenerativeModel(
        model_name="gemma-4-31b-it", 
        system_instruction=system_prompt,
        generation_config={"response_mime_type": "application/json"}
    )
    
    max_retries = len(API_KEYS) * 2 if len(API_KEYS) > 1 else 3
    
    for attempt in range(max_retries):
        try:
            response = await model.generate_content_async(json.dumps(user_data))
            text = response.text
            # Robust JSON extraction to bypass markdown formatting
            start, end = text.find("{"), text.rfind("}")
            if start != -1 and end != -1: text = text[start:end+1]
            return json.loads(text)
        except Exception as e:
            if len(API_KEYS) > 1:
                async with key_lock:
                    current_key_idx = (current_key_idx + 1) % len(API_KEYS)
                    genai.configure(api_key=API_KEYS[current_key_idx])
            await asyncio.sleep(2 ** attempt) # Exponential backoff
            
    return {"error": "All retry attempts failed."}

async def run_pipeline(signal_data: dict, session_history: list) -> dict:
    # Phase 1: Parallel (agents 1, 2, 3)
    phonetic, difficulty, engagement = await asyncio.gather(
        call_gemma(PHONETIC_SYSTEM_PROMPT, signal_data),
        call_gemma(DIFFICULTY_SYSTEM_PROMPT, signal_data),
        call_gemma(ENGAGEMENT_SYSTEM_PROMPT, signal_data),
    )
    # Phase 2: Practice waits for 1+2+3; Progress runs in parallel with Practice
    practice_input = {**phonetic, **difficulty, **engagement, "grade": signal_data.get("grade", 3)}
    progress_input = {"sessions": session_history, "today_diagnosis": {**phonetic, **difficulty, **engagement}, **signal_data}
    practice, progress = await asyncio.gather(
        call_gemma(PRACTICE_SYSTEM_PROMPT, practice_input),
        call_gemma(PROGRESS_SYSTEM_PROMPT, progress_input),
    )
    return {"phonetic": phonetic, "difficulty": difficulty, "engagement": engagement, "practice": practice, "progress": progress}
```

---

## 🗄️ DATABASE SCHEMA (SQLite)

```sql
CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, grade INTEGER NOT NULL,
  level TEXT DEFAULT 'Level 1', created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY, student_id TEXT REFERENCES students(id),
  target_sentence TEXT, transcript TEXT, audio_path TEXT,
  wpm REAL, accuracy REAL, overall_score INTEGER,
  timestamp TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS signal_data (
  session_id TEXT PRIMARY KEY REFERENCES sessions(id),
  pauses TEXT, pitch_series TEXT, pitch_variance REAL,
  repetition_count INTEGER DEFAULT 0, hesitation_count INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS diagnoses (
  session_id TEXT PRIMARY KEY REFERENCES sessions(id),
  phonetic_result TEXT, difficulty_result TEXT,
  engagement_result TEXT, practice_result TEXT, progress_result TEXT
);
-- Seed demo student
INSERT OR IGNORE INTO students VALUES ('student-1','Aarav Sharma',3,'Level 2',datetime('now'));
```

---

## 🌐 API ENDPOINTS

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Returns `{"status": "ok"}` |
| GET | `/students` | All students |
| POST | `/students` | Create student `{name, grade}` |
| POST | `/pipeline/run` | Run 5-agent pipeline `{student_id, audio_base64, target_sentence}` |
| GET | `/sessions/{student_id}` | Session history with diagnoses |

---

## 🚀 SETUP COMMANDS (Run in Order on Hackathon Day)

```powershell
# 1. Backend
cd d:\[Project]\SpeakFlow
mkdir backend; cd backend
pip install fastapi uvicorn google-generativeai librosa webrtcvad openai-whisper numpy python-multipart python-dotenv
# Create .env: GOOGLE_API_KEYS=key1,key2,key3
uvicorn main:app --reload --port 8000

# 2. Frontend (new terminal)
cd d:\[Project]\SpeakFlow
npx create-next-app@latest frontend --typescript --tailwind --app --no-src-dir --import-alias "@/*" --yes
cd frontend
npm install recharts lucide-react
npm run dev
# → http://localhost:3000
```

---

## 📺 DEMO SCRIPT (60 Seconds for Judges)

1. **Hook:** "30 kids, 1 teacher — no time for individual reading diagnosis."
2. **What it does:** "SpeakFlow listens to a child read, and 5 specialized Gemma agents diagnose exactly what they struggle with."
3. **Show:** Live transcript with orange-highlighted struggling word + animated waveform
4. **Pipeline reveal:** Show "AI Agents at Work" — agents light up Complete / In Progress / Pending
5. **Explain:** "Agent 1: phonemes. Agent 2: type of struggle. Agent 3: emotional state. All parallel."
6. **Output:** Show diagnosis card (82/100 radial score) + practice sentences card
7. **Closer:** "This is not a chatbot. It's a diagnostic pipeline. Built on Gemma 4."

**If live audio fails:** Pre-load demo session → click "View Last Session" → full results appear.

---

## ✅ 3-HOUR HACKATHON CHECKLIST

### Hour 1 — Backend + Gemma Pipeline
- [ ] Folder structure created
- [ ] `.env` with `GOOGLE_API_KEYS` (comma-separated for rotation)
- [ ] All 5 agent `.py` files (prompts above)
- [ ] `orchestrator.py` (pattern above)
- [ ] `schema.py` + run to create + seed DB
- [ ] `main.py` with FastAPI + CORS
- [ ] `GET /health` → 200
- [ ] `POST /pipeline/run` with mock data → valid JSON output

### Hour 2 — Frontend Dashboard
- [ ] Next.js created + dependencies installed
- [ ] CSS variables in `globals.css`
- [ ] `Sidebar.tsx` + `Topbar.tsx`
- [ ] `LiveReadingCard.tsx` (waveform CSS animation)
- [ ] `SessionSummaryCard.tsx` (2×2 grid)
- [ ] `AIDiagnosisCard.tsx` + SVG radial score
- [ ] `AgentsAtWorkCard.tsx` (polls `/agents/status`)
- [ ] `PracticeCard.tsx` + `ProgressChart.tsx` (Recharts)

### Hour 3 — Wire + Polish + Demo
- [ ] `api.ts` connected to FastAPI
- [ ] MediaRecorder → POST `/pipeline/run`
- [ ] 7 days of session history seeded
- [ ] Full end-to-end test
- [ ] Matches `Dashboard.jpeg`
- [ ] Demo pitch practiced (3 runs)

---

## 🔑 LOCKED DECISIONS

| Decision | Choice |
|---|---|
| Frontend | Next.js 14 App Router + TypeScript + Tailwind |
| Backend | FastAPI + Python 3.11 |
| AI model | Gemma 4 via Google AI Studio (`gemma-4-31b-it`) |
| Agent pattern | Same model, 5 role-scoped prompts, asyncio parallel with API rotation |
| Database | SQLite (zero setup) |
| Demo | Local machine (http://localhost:3000) |
| Audio fallback | Pre-seeded demo session data |
| Design source of truth | `Dashboard.jpeg` in project root |
| Team size | 4 people |
