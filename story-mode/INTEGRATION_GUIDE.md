# SpeakFlow — Story Mode Integration Guide

> This folder is a **self-contained package** of the entire Story Mode feature built for SpeakFlow. Copy it into your existing project and follow the steps below. Your project already has the teacher dashboard, student workflow, and roleplay — this adds the missing piece: the **student story reading experience with word-by-word, letter-by-letter pronunciation feedback**.

---

## What's in This Folder

```
story-mode/
├── INTEGRATION_GUIDE.md              <- You are here
├── frontend/
│   ├── app/
│   │   └── read/
│   │       ├── page.tsx              <- Story Map (chapter selector)
│   │       └── [chapterId]/
│   │           └── page.tsx          <- Checkpoint recording + feedback page
│   ├── components/
│   │   ├── ChapterMap/
│   │   │   ├── MapNode.tsx           <- Chapter node (completed/in-progress/locked)
│   │   │   └── StarBadge.tsx         <- Star count badge in header
│   │   ├── Checkpoint/
│   │   │   ├── MicButton.tsx         <- Record/Stop button with states
│   │   │   ├── ReadingPrompt.tsx     <- Displays target sentence to read
│   │   │   └── WaveformVisualizer.tsx <- Live audio waveform while recording
│   │   ├── Feedback/
│   │   │   ├── MascotMessage.tsx     <- Animated star mascot + Gemini speech bubble
│   │   │   ├── MetricPills.tsx       <- Accuracy / WPM / Pauses display
│   │   │   ├── PracticeSection.tsx   <- Letter-tile breakdown + TTS for tricky word
│   │   │   ├── ScoreRing.tsx         <- Animated circular accuracy ring
│   │   │   ├── WordAnalysis.tsx      <- Full word-by-word + letter-by-letter inspector
│   │   │   └── WordChip.tsx          <- Individual word chip with hover tooltip
│   │   └── Rewards/
│   │       └── RewardsScreen.tsx     <- Checkpoint complete screen (+stars, +badge)
│   ├── contexts/
│   │   ├── ReadingSessionContext.tsx <- Chapter/checkpoint navigation state
│   │   └── SpeakFlowContext.tsx      <- API pipeline state (Phase 1 + Phase 2)
│   ├── hooks/
│   │   └── useAudioRecorder.ts       <- MediaRecorder + live waveform hook
│   └── lib/
│       └── api.ts                    <- All TypeScript types + API call functions
└── backend/
    ├── main_app.py                   <- FastAPI app setup (lifespan, CORS, routers)
    ├── requirements.txt              <- Python dependencies
    ├── core/
    │   └── config.py                 <- Pydantic settings (.env reader)
    ├── api/
    │   ├── models.py                 <- All Pydantic request/response models
    │   ├── rest_sessions.py          <- Story-mode REST API (create, analyze, feedback)
    │   └── ws_sessions.py            <- WebSocket handler (Phase 1 + Phase 2 streaming)
    ├── services/
    │   ├── stt/
    │   │   ├── groq_whisper.py       <- Groq Whisper API (online, primary STT)
    │   │   ├── local_whisper.py      <- faster-whisper local fallback (offline)
    │   │   └── wrapper.py            <- Auto-selects Groq or local
    │   ├── acoustic/
    │   │   ├── feature_extractor.py  <- Librosa audio feature extraction
    │   │   ├── scorer.py             <- Composite acoustic scoring vs reference
    │   │   └── models.py             <- FeatureVector Pydantic model
    │   ├── llm/
    │   │   ├── gemini_client.py      <- Gemini Flash-Lite: feedback + hesitation
    │   │   └── exceptions.py         <- GeminiUnavailableError, GeminiTimeoutError
    │   ├── dictionary/
    │   │   └── reference_dictionary.py <- Reference acoustic lookup by word
    │   ├── network/
    │   │   └── connectivity.py       <- DNS-based online/offline detection
    │   └── reasoning/
    │       └── wrapper.py            <- Gemini -> template fallback for feedback
    └── storage/
        ├── database.py               <- aiosqlite: sessions, checkpoints, words
        └── sync.py                   <- Mock cloud sync for offline-first sessions
```

---

## How Story Mode Works (Architecture Overview)

### Student Flow

```
/read                       <- Story Map (pick a chapter)
  |
  +-- Click chapter node
        |
        +-- /read/ch1       <- Checkpoint page
              |
              +-- Read sentence aloud (shown in ReadingPrompt)
              +-- Tap mic -> record -> stop (MicButton + WaveformVisualizer)
              |
              |   [Phase 1: fast, ~1-3 seconds]
              +-- POST /api/v1/sessions/{id}/analyze
              |   Returns: per-word accuracy + letter-by-letter diffs
              |
              +-- Show score ring + word chips immediately (WordAnalysis)
              |
              |   [Phase 2: async background, ~2-5 seconds]
              +-- Poll GET /api/v1/sessions/{id}/feedback/{cp_id}
              |   Returns: Gemini feedback text + practice word recommendation
              |
              +-- Show mascot speech bubble + PracticeSection
              +-- Click "Next Checkpoint" -> Rewards Screen -> repeat
```

### Backend Pipeline (per recording)

1. **STT** — Groq `whisper-large-v3` transcribes audio with per-word timestamps and confidence scores. Falls back to local `faster-whisper` if offline.

2. **Word Alignment** — Python `difflib.SequenceMatcher` aligns spoken words against the target sentence, handling substitutions, omissions, and insertions at the word level.

3. **Acoustic Scoring** — For each aligned word, `librosa` extracts 11 acoustic features: pitch F0, formants F1/F2, MFCCs x13, spectral centroid, flatness, ZCR, energy, rolloff, bandwidth, pause ratio. Scored against a reference dictionary.

4. **Letter Diff** — `SequenceMatcher` runs again at character level on each word pair. Returns a `letter_diff` array with `type` (match/replace/insert/delete), `expected`, and `heard` strings.

5. **Mismatch Classification**:
   - `mispronounced` — word was heard but letters differ (STT got a different word)
   - `acoustic_low` — word spelled correctly but acoustic score < threshold (spoke too quietly/unclearly)
   - `omitted` — word was completely skipped (not spoken at all)

6. **Phase 2 (background task)** — Gemini Flash-Lite generates encouraging feedback text, judges hesitations. Falls back to a template bank if Gemini fails.

---

## Frontend Integration Steps

### Step 1: Copy Files

Copy the `frontend/` folder contents into your Next.js project root, preserving the directory structure. Import aliases using `@/` should resolve automatically.

> **Note on SpeakFlowContext:** In the original project this file lived at `Context/SpeakFlowContext.tsx` (capital C). It's been moved to `contexts/SpeakFlowContext.tsx` in this package. Update the import in your `app/read/[chapterId]/page.tsx` accordingly:
>
> ```tsx
> // Was: import { useSpeakFlow } from '../Context/SpeakFlowContext';
> // Now: import { useSpeakFlow } from '@/contexts/SpeakFlowContext';
> ```

### Step 2: Wrap Your App with Providers

Both context providers need to wrap the checkpoint pages. Add them in `app/read/layout.tsx`:

```tsx
import { SpeakFlowProvider } from '@/contexts/SpeakFlowContext';
import { ReadingSessionProvider } from '@/contexts/ReadingSessionContext';

export default function ReadLayout({ children }) {
  return (
    <SpeakFlowProvider>
      <ReadingSessionProvider>
        {children}
      </ReadingSessionProvider>
    </SpeakFlowProvider>
  );
}
```

IMPORTANT: `ReadingSessionProvider` depends on `SpeakFlowProvider` (it calls `useSpeakFlow()` internally). `SpeakFlowProvider` must be the outer wrapper.

### Step 3: Environment Variable

Add to `.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:8003
```

### Step 4: Frontend Dependencies

Story mode only requires `lucide-react` for icons:

```bash
npm install lucide-react
```

### Step 5: Add CSS Design Tokens

Add to your global CSS (e.g., `globals.css`):

```css
:root {
  --bg-base: #f0f0ff;
  --accent-primary: #C9BFF0;
  --accent-secondary: #7B61FF;
  --text-primary: #1a1a2e;
  --text-secondary: #6B7280;
  --success: #4CAF50;
  --warning: #FDD835;
  --error: #FF4D4F;
  --font-urdu: 'Noto Nastaliq Urdu', serif;
}
```

---

## Backend Integration Steps

### Option A: Merge Into Your Existing FastAPI App

If you already have a FastAPI backend, add these routers alongside your existing ones:

```python
from .api.rest_sessions import router as story_sessions_router
from .api.ws_sessions import router as ws_router

app.include_router(story_sessions_router, prefix="/api/v1")
app.include_router(ws_router)
```

Add to your lifespan: `await init_db()` (from `storage/database.py`).

### Option B: Run as Standalone Backend

```bash
pip install -r requirements.txt
pip install av faster-whisper httpx  # Add these too
uvicorn main_app:app --port 8003 --reload
```

### Required .env

```
GROQ_API_KEY=gsk_...
GEMINI_API_KEY=AIza...
CORRECT_THRESHOLD=70
ENV=dev
```

---

## API Reference

### POST /api/v1/sessions
Create a new reading session.

Request: `{ "student_id": "stu_001", "story_id": "ch1", "language": "en" }`

Response: `{ "session_id": "sess_abc123", "checkpoints": [...] }`

### POST /api/v1/sessions/{session_id}/analyze
Submit audio. Returns Phase 1 immediately; Phase 2 processes async in background.

Form data: `audio` (file) + `checkpoint_id` (string)

Response includes `words[]` array with per-word:
- `word` — target word from the sentence
- `correct` — boolean
- `phoneme_mismatch` — null | "mispronounced" | "acoustic_low" | "omitted"
- `transcribed_word` — what Whisper actually heard
- `acoustic_score` — 0-100 composite acoustic score
- `letter_diff` — array of {type, expected, heard} character-level diffs
- `diagnostics` — {clarity_score, loudness_score, pitch_stability}

### GET /api/v1/sessions/{session_id}/feedback/{checkpoint_id}
Poll for Phase 2. Returns 404 until ready, then 200 with:
- `feedback_text` — Gemini encouragement message
- `practice_recommendation` — which word to practice
- `engagement_state` — "confident" | "hesitant"

---

## Word Error Types — UI Behavior

| phoneme_mismatch | Color | Word Chip Badge | Inspector Message |
|---|---|---|---|
| null (correct) | Green | None | "Pronounced Correctly" |
| "mispronounced" | Rose/Red | `Said: "ribbit"` | Letter diff grid: Target row vs You Said row |
| "acoustic_low" | Amber/Yellow | `Speak Louder` | "Good effort! Try speaking slightly louder." |
| "omitted" | Slate/Gray | `Skipped` | "You skipped this word. Press Listen to hear it!" |

---

## Content / Story Data

Checkpoint sentences are currently hardcoded in two places — keep them in sync:

1. Backend `api/rest_sessions.py` — `DEMO_CHECKPOINTS` list + `MOCK_CHECKPOINTS` dict
2. Frontend `contexts/ReadingSessionContext.tsx` — `DEMO_CHECKPOINTS` + `URDU_CHECKPOINTS`

Current English checkpoints:
```
cp_1: "The brave little rabbit hopped through the meadow."
cp_2: "The little explorer climbed the steep mountain slowly."
cp_3: "She found a hidden path between the tall dark trees."
cp_4: "The golden key unlocked a chest full of sparkling gems."
cp_5: "All the forest animals gathered to celebrate together."
```

---

## Known Limitations / TODO

1. Checkpoint content is hardcoded — replace with DB-driven story content system.
2. `PHASE2_RESULTS` dict in `rest_sessions.py` is in-memory — move to Redis/DB for multi-worker.
3. Chapter progress in `ReadingSessionContext` is React state only — resets on refresh. Wire to your DB/localStorage.
4. `av` (PyAV), `faster-whisper`, and `httpx` are missing from `requirements.txt` — add them.
5. CORS origins in `main_app.py` are `localhost:3000/3001` — update for production.
6. The `phoneme_dictionary.json` and `manual_overrides.json` data files for `ReferenceDictionary` are not included (they're large and live in `backend/data/`). Without them the scorer falls back to intrinsic quality scoring (still functional, just less calibrated).

---

## Quick End-to-End Test

1. Start backend on port 8003
2. Start Next.js dev server
3. Go to `/read`
4. Click "The Brave Little Rabbit"
5. Read the sentence aloud
6. Submit recording
7. Observe: green chips = correct, red chips = mispronounced (with letter diff), yellow = quiet, gray = skipped
8. Click any chip to see the letter-by-letter inspector
9. Wait ~3s for Gemini feedback bubble to appear on mascot
