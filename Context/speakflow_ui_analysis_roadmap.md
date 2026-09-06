# SpeakFlow Frontend — UI Analysis, Gap Report & Google AI Studio Build Prompts

Based on a direct read of `TeamXOF/SpeakFlow_/frontend` (cloned and inspected in full — 23 source files, ~2,400 lines) as it exists today, cross-checked against the locked backend architecture and API contract from the roadmap/architecture doc. This is the **starting point** you're extending in Google AI Studio, not a from-scratch build.

---

## Part 1 — What's Actually There

### 1.1 Stack & Design System

- **Next.js 16 (App Router), React 19, TypeScript, Tailwind v4**, `recharts` for charts, `lucide-react` for icons, `date-fns` for relative timestamps. No component library (shadcn etc.) — everything is hand-built Tailwind.
- **Design tokens** live in `app/globals.css` as CSS variables, mapped into Tailwind via `@theme inline`: cream background (`--bg-base: #FAF7F2`), white cards, a soft lavender accent (`--accent-primary: #C9BFF0`) and pink secondary (`--accent-secondary: #F5C6D8`), black 1px borders on everything (`--border-color: #1A1A1A`), 16px-rounded `.speakflow-card` utility class, DM Sans for UI text + JetBrains Mono for labels/numbers/timestamps. This is a coherent, already-attractive system — worth **keeping and extending**, not replacing.
- Global layout (`app/layout.tsx`) is a fixed sidebar + topbar shell wrapping every page in a single `SpeakFlowProvider` (React Context, no external state library).

### 1.2 Page Inventory (`app/`)

| Route | Purpose today |
|---|---|
| `/dashboard` | The core screen — live reading session console (record, transcript, live scoring, "5 agents" panel, practice suggestions, progress chart) |
| `/students` | Student roster — full CRUD |
| `/sessions` | Historical session table |
| `/agents` | "AI Agents Command Center" — static list of 5 Gemma agents + fake terminal log |
| `/practice` | "Practice Center" — static exercise catalog |
| `/progress` | Trend stat cards + line chart |
| `/reports` | Static report list with download/print buttons |
| `/settings` | Backend health check + API key pool status + architecture explainer text |

All are teacher/admin-facing. **There is no student/kid-facing screen anywhere in this codebase** — no story view, no checkpoints, no game.

### 1.3 State Management — `context/SpeakFlowContext.tsx`

One global context drives the entire live-session experience:
- `sessionState`: `idle → listening → processing → complete`
- `startSession()`: requests mic access, sets up a live `AnalyserNode` for the waveform visualizer, starts a `MediaRecorder`, starts a 1s interval timer.
- `stopListening()`: stops recording, converts the recorded blob to **base64**, calls `runPipeline(studentId, base64Audio, targetSentence)` — a single synchronous call — and populates `transcript`, `overallScore`, `wpm`, `accuracy`, `pauses`, and a 5-entry `agents` array from the response.
- `agents`: hardcoded to 5 fixed IDs — `phonetic`, `difficulty`, `engagement`, `practice`, `progress` — each expecting a `result` object keyed by agent-specific fields (`struggling_words`, `struggling_phonemes`, `primary_issue`, `emotional_state`, `focus_area`, `sentences`).
- `targetSentence` / `availableSentences`: a free-text sentence picker, not a checkpoint/story structure.
- No concept of `language`, no concept of online/offline mode, no concept of a multi-checkpoint session.

### 1.4 Current API Client — `lib/api.ts`

Hardcoded to `http://127.0.0.1:8000`, no env-based configuration, no mode detection:
- `GET/POST/PUT/DELETE /api/students`
- `GET /api/sessions?student_id=`
- `POST /pipeline/run` — the single-shot pipeline call, body `{ student_id, target_sentence, audio_base64 }`, one synchronous JSON response containing everything (transcript, scores, and a `diagnosis` object keyed by the 5 agent IDs).

No multipart upload, no phased response, no WebSocket, no checkpoint ID, no language field, no health-based mode switching.

### 1.5 Real vs. Mock — what's actually wired up

This matters for sequencing the roadmap: some pages look finished but are pure decoration.

| Page / Component | Status | Notes |
|---|---|---|
| Dashboard + its 6 cards (`LiveReadingCard`, `SessionSummaryCard`, `AIDiagnosisCard`, `AgentsAtWorkCard`, `PracticeCard`) | **Real** | Genuinely wired to live context state and a real backend call. Needs contract updates, not a rebuild. |
| Students page | **Real** | Full CRUD wired to real endpoints. |
| Sessions page | **Real, with a gap** | Fetches real session list, but the "Duration" column is hardcoded `"1m 12s"` for every row, and clicking a row only fires a toast notification — there's no session detail view. |
| Settings page | **Partially real** | The backend health check (`GET /health`) and key-pool count are real, live-fetched. Everything it *says* about the architecture is not (see 2.2). |
| `ProgressChart` component | **Mock** | Always renders `MOCK_SESSION_DATA.progressChart` from `lib/mockData.ts`, regardless of what actually happened. Never fetches real history. |
| `/agents` page | **Fully mock** | Hardcoded agent list, hardcoded latency numbers, a fake terminal log with a fixed timestamp (`2026-07-13`). Zero real data. |
| `/practice` page | **Fully mock** | Hardcoded exercise catalog; "Start" just fires a toast, no backend call. |
| `/reports` page | **Fully mock** | Hardcoded report list; download/print buttons just fire toasts. |
| `/progress` top stat cards | **Mock** | `+12%` / `+5%` / `-8%` are hardcoded strings, not computed. |

---

## Part 2 — Gap Analysis: Old UI vs. the Locked New Backend

### 2.1 Structural mismatches (block everything until fixed)

1. **Base URL & mode.** Hardcoded `127.0.0.1:8000` with no online/offline distinction. The new backend has a real `GET /health` mode field and a LAN-IP local-host mode — the client needs to resolve its base URL from that, not a constant.
2. **Audio transport.** Old: base64 string in a JSON body to `/pipeline/run`. New: `multipart/form-data` to `POST /sessions/{session_id}/analyze` with `checkpoint_id`.
3. **Response shape.** Old: one synchronous response with everything. New: **two phases** — an immediate Phase 1 (correctness, ~400ms) and an async Phase 2 (feedback, delivered over `/ws/sessions/{session_id}` or by polling). The current `stopListening()` awaits one response and is done; it has no concept of a second, later payload.
4. **Session model.** Old: a flat "record → get one result" loop against a freely-typed `targetSentence`. New: `POST /sessions` creates a session with a fixed list of `checkpoints`, and each checkpoint is submitted individually via its `checkpoint_id`. This is a real data-model change, not just a rename.
5. **No language field anywhere.** The whole app assumes English. Nothing carries `language: "en" | "ur"`, no Urdu-capable font is loaded, no RTL handling exists for Urdu text.

### 2.2 Conceptual mismatch — the "5 Gemma agents" problem

This is the one worth deciding deliberately rather than papering over. The current UI's entire mental model — the Dashboard's "Agents at Work" card, the whole `/agents` page, and half of `/practice` — is built around **5 parallel Gemma LLM agents**, each owning a distinct job:

| Old agent | Old job | New backend equivalent |
|---|---|---|
| Phonetic Analyst | phoneme mismatch detection | ✅ covered — but by librosa + the reference dictionary, **not an LLM call** |
| Engagement Tracker | pause/emotional-state judgment | ✅ covered — Gemini hesitation-judgment call (4b) |
| Difficulty Assessor | Lexile complexity delta, scale up/down advice | ❌ **no equivalent in the locked backend.** This feature doesn't exist in the new architecture at all. |
| Practice Generator | 3 custom AI-generated practice sentences with target phonemes | ⚠️ **partially covered** — Phase 2 has a single `practice_recommendation` field, not a set of generated custom sentences. Much lighter than what this UI currently expects. |
| Progress Synthesizer | live per-session trend synthesis | ✅ covered — but as a separate `GET /students/{id}/dashboard` query, not a live "agent" that runs per-session |

**Decision this roadmap makes (flagging it rather than silently choosing):** the UI drops the "5 independent LLM agents" framing entirely and gets rebuilt around the real pipeline stages (STT → acoustic/dictionary comparison → Gemini feedback → Gemini hesitation judgment), which is both more honest and matches what's actually been built and audited on the backend. The Lexile/difficulty-scaling feature and the 3-custom-sentence practice generator are **not rebuilt** — they were never in the locked backend scope, and building UI for a backend feature that doesn't exist would just recreate the same "vaporware" problem this whole build has been avoiding since the Qwen swap. If you want Lexile scaling or richer practice generation back, that's a backend scope conversation, not a frontend one — happy to spec it if you want it added.

### 2.3 Missing entirely (net-new build, not a modification)

- **The kid-facing "Reading Buddy" checkpoint/story screen** (PRD Feature 4). Nothing like it exists — every current page is a teacher console. This is the single biggest net-new piece of work.
- **Educator class-wide heatmap** (PRD Feature 8) — `ProgressChart` today shows one mocked student's trend line, not a per-sound, class-wide error-rate view.
- **Parent WhatsApp/SMS example message** (PRD Feature 7) — not present anywhere.
- **Offline/local-mesh awareness** — Settings shows generic online/offline, but nothing distinguishes "cloud" vs. "this laptop is the local host," and there's no sync-queue visibility or manual "Sync now" control.
- **Language selector + Urdu rendering** — font loading, RTL for the Urdu text block specifically (not the whole app chrome), phoneme-pair highlighting for pairs like ق/ک.

### 2.4 What to leave alone

The layout shell (`Sidebar`, `Topbar`, `NotificationToaster`, `ClientProviders`), the entire design-token system in `globals.css`, the Students CRUD page, and the general visual language of `speakflow-card` components are all solid and shouldn't be touched except where a prompt below explicitly says to. Don't let Google AI Studio "improve" things that already work — scope each prompt tightly.

---

## Part 3 — Step-by-Step Roadmap

Phase-based rather than hour-tied, since this runs in parallel with the backend build and its pace depends on when each backend piece lands. Each phase names what it depends on from the backend roadmap.

**Phase 0 — Foundation (depends on: backend Prompt 1, health endpoint live)**
Rewire the API layer and state management to the new contract shape *before* touching any visible UI. Get `lib/api.ts` and `SpeakFlowContext` speaking the new language against a stubbed/mocked response first, so every later phase builds on a correct foundation instead of patching the old one repeatedly.
*Verified by:* a manual test session against the real (or a mocked) `/health` and `/sessions/{id}/analyze` endpoint produces correctly-typed Phase 1 state in the context, with no more references to the old `diagnosis`/agent-ID structure anywhere in the codebase.

**Phase 1 — Correct the narrative (depends on: nothing backend-side)**
Fix `Settings` and `/agents` before building anything new — no sense polishing new features next to pages that actively misdescribe the architecture. Replace the Gemma/API-key-pool copy with the real pipeline (Groq/local Whisper → librosa → dictionary → Gemini feedback + hesitation), and turn `/agents` into a real pipeline-stage monitor fed by `latency_ms`, `stt_source`, and `feedback_source` instead of a fake terminal log.
*Verified by:* no page in the app claims "no raw audio leaves your machine" or references `gemma-4-31b-it`; the pipeline-stage view reflects real values from an actual API response, not hardcoded strings.

**Phase 2 — Two-phase session flow + checkpoints (depends on: backend Prompts 2–5, 9)**
Rebuild the Dashboard's live-session flow around `POST /sessions` → per-checkpoint `POST /sessions/{id}/analyze` → Phase 1 immediate update → Phase 2 async update via WebSocket. This is the structural heart of the rebuild.
*Verified by:* a full session against the real backend shows the Phase 1 correctness state appear fast (<1s perceived), followed by feedback text arriving separately without blocking the UI.

**Phase 3 — Language support (depends on: nothing backend-side beyond the dictionary existing)**
Add the language selector, load an Urdu-capable font, and handle RTL specifically for Urdu target-text and transcript blocks.
*Verified by:* switching to Urdu renders target sentences and transcripts in a legible Urdu font with correct text direction, while the rest of the app chrome stays LTR and unaffected.

**Phase 4 — Offline/local-mesh awareness (depends on: backend Prompts 6–8)**
Extend Settings with cloud-vs-local-host mode, sync-queue count, and a manual "Sync now" button. Add `stt_source`/`feedback_source` badges to session results wherever they're shown.
*Verified by:* forcing the backend into offline mode changes the Settings indicator and a subsequent session correctly shows `local_fallback`/`template_fallback` badges.

**Phase 5 — The Reading Buddy (net-new; depends on: backend checkpoint flow from Phase 2 being solid)**
Build the actual kid-facing screen — simplified, larger type, playful, checkpoint-driven, using the same recording mechanics already proven in `SpeakFlowContext` but a completely different visual language from the teacher console.
*Verified by:* a full 3–5 checkpoint story session run start-to-finish on this screen by someone who isn't the developer, without instructions.

**Phase 6 — Educator dashboard + parent message (depends on: backend `GET /students/{id}/dashboard`)**
Replace the mocked `ProgressChart` trend with a real class-wide per-sound heatmap, and add the static parent WhatsApp/SMS example card.
*Verified by:* the heatmap reflects actual stored session data (even if that's just repeated single-user test runs, per the backend's own scoping note), not `MOCK_SESSION_DATA`.

**Phase 7 — Integration pass & demo dry run**
Run the full flow — teacher console *and* Reading Buddy — against the real backend end to end, in both online and offline mode, in both languages. Freeze scope per the same BUILT/TO BUILD/ROADMAP-ONLY discipline as the backend: anything not verified working in this pass doesn't go in the pitch.

---

## Part 4 — Google AI Studio Build Prompts

Numbered, self-contained, ready to paste into Google AI Studio's Build mode one at a time against the existing `frontend/` codebase. Each references real file paths and real component/variable names from the current repo — nothing here assumes a rebuild from scratch.

---

**Prompt 1 — API layer rewrite**
```
In this Next.js app, rewrite lib/api.ts for a new backend contract. Keep the existing
exported function names where they still make sense (fetchStudents, createStudent,
updateStudent, deleteStudent, fetchSessions) but:

- Replace the hardcoded "http://127.0.0.1:8000" constant with a resolveApiBase()
  helper that calls GET /health first and caches the returned base URL + mode
  ("online" | "offline") for 5 seconds before re-checking.
- Remove runPipeline entirely. Replace it with:
    createSession(studentId: string, storyId: string, language: "en" | "ur")
      -> POST /api/v1/sessions
    analyzeCheckpoint(sessionId: string, checkpointId: string, audioBlob: Blob)
      -> POST /api/v1/sessions/{sessionId}/analyze as multipart/form-data
         (fields: audio, checkpoint_id), returns the Phase 1 JSON shape below
    fetchStudentDashboard(studentId: string, range: "session"|"week"|"all")
      -> GET /api/v1/students/{studentId}/dashboard
    triggerSync() -> POST /api/v1/sync

Add TypeScript types for the Phase 1 response:
  { session_id, checkpoint_id, phase: 1, transcript, words: {word, correct,
    phoneme_mismatch}[], wpm, hesitations: {after_word, pause_ms,
    flagged_ambiguous}[], stt_source: "groq"|"local_fallback",
    latency_ms: {...}, warnings: string[] }
and the Phase 2 payload delivered separately (see Prompt 2):
  { session_id, checkpoint_id, phase: 2, feedback_text, engagement_state,
    comprehension_question, practice_recommendation, feedback_source:
    "gemini"|"template_fallback", latency_ms: {...} }
and the shared error envelope: { error: { code, message, retryable } }.

Don't touch any UI components in this prompt — this is the data layer only.

Done when: the project builds with no TypeScript errors, and a manual fetch() test
against a mocked /health response correctly resolves online vs offline mode.
```

---

**Prompt 2 — SpeakFlowContext rewrite for two-phase, checkpoint-based sessions**
```
Rewrite context/SpeakFlowContext.tsx to work with the new API layer from lib/api.ts.

Replace the single targetSentence/availableSentences model with:
  currentSession: { session_id, checkpoints: {checkpoint_id, target_text}[] } | null
  currentCheckpointIndex: number
  startNewSession(studentId, storyId, language) -> calls createSession, stores result
  recordAndAnalyzeCheckpoint() -> keeps the EXISTING MediaRecorder/AnalyserNode logic
    from the current startSession/stopListening (don't rewrite the mic capture code,
    it works), but on stop, instead of base64-encoding, pass the raw Blob to
    analyzeCheckpoint(). On response, apply the Phase 1 fields immediately to state.

Add a WebSocket connection (or polling fallback) that listens for the Phase 2 payload
on /ws/sessions/{session_id} and applies feedback_text, engagement_state,
comprehension_question, practice_recommendation, feedback_source to state once it
arrives — this must NOT block the Phase 1 UI update.

Remove the `agents` array and the 5-fixed-ID agent model entirely — replace with a
simpler `pipelineStatus` object tracking stage-by-stage state (stt, acoustic, feedback,
hesitation) derived from the new response shape, for use by the reworked pipeline-stage
view in Prompt 3.

Keep addNotification/markNotificationsAsRead and the mic-permission error handling
exactly as they are.

Done when: triggering a session against a mocked backend response updates state
immediately on the Phase 1 payload and again (separately, visibly later) on the Phase 2
payload, with no console errors.
```

---

**Prompt 3 — Correct the Settings page**
```
In app/settings/page.tsx, remove all copy and UI describing the "Google API Key Pool"
/ "5 parallel Gemma agents" / "gemma-4-31b-it" architecture, and the claim "No raw
audio ever leaves your machine."

Replace the "Active AI Model" section and the info box at the bottom with an accurate
description of the real pipeline: STT via Groq Whisper API (online) or a local
quantized Whisper model (offline fallback), acoustic evidence via librosa, and Gemini
3.5 Flash-Lite for feedback text generation and hesitation judgment — note plainly that
the hesitation-judgment call does send a short raw audio clip to Google's API, unlike
the rest of the pipeline.

Keep the existing real GET /health-based backend status card as-is structurally, but
extend it to also show `mode` ("online"/"offline") from the health response, not just
reachability.

Done when: no text anywhere on this page references Gemma, a rotating API key pool, or
claims audio never leaves the device.
```

---

**Prompt 4 — Rebuild the /agents page as a real pipeline-stage monitor**
```
Replace the fully-hardcoded agent list and fake terminal log in app/agents/page.tsx
with a real view of the actual pipeline stages: STT, Acoustic/Dictionary Comparison,
Gemini Feedback, Gemini Hesitation Judgment. Drive this from the pipelineStatus object
in SpeakFlowContext (from Prompt 2) and the latency_ms breakdown returned in the real
API responses — do not hardcode any latency numbers or status text.

Keep the same two-column card-based layout style (left: stage list, right: a live log
panel) since it reads well, but the right-hand panel should append a real log line per
stage transition (e.g. "STT complete via groq — 190ms") as they actually happen during
a live session, not a fixed historical transcript.

Rename the page title away from "AI Agents Command Center" to something that doesn't
imply multiple independent LLM agents — e.g. "Pipeline Monitor."

Done when: running a real session updates this page's stage statuses and latency
numbers live, and the page shows an empty/idle state correctly when no session has run.
```

---

**Prompt 5 — Language selector + Urdu rendering**
```
Add a language selector (English / Urdu) to the session-start flow — the same place
targetSentence selection used to live in LiveReadingCard, now adapted to select story
language before calling startNewSession(studentId, storyId, language) from Prompt 2's
context.

Load a font capable of rendering Urdu script (e.g. Noto Nastaliq Urdu via next/font or
a Google Fonts import) and apply it, with dir="rtl", specifically to the target-sentence
display and live-transcript blocks when language is "ur" — do not change text direction
or fonts anywhere else in the app chrome (sidebar, topbar, buttons stay LTR/DM Sans
regardless of session language).

Done when: starting a session in Urdu renders the target sentence and transcript in a
legible Urdu font with correct right-to-left flow, while every other part of the screen
is visually unchanged.
```

---

**Prompt 6 — Offline/local-mesh awareness + sync UI**
```
Extend the Settings page's backend status card (from Prompt 3) to distinguish three
states instead of two: "Cloud (online)", "Local host (offline)", and "Unreachable" —
sourced from the mode field in GET /health plus whether the resolved API base is a LAN
address.

Add a "Sync Status" section: show a count of unsynced queued sessions (poll a count
from the backend — if no dedicated count endpoint exists yet, call POST /sync and show
its returned synced_count/failed_count after each manual trigger) and a "Sync Now"
button that calls triggerSync() from lib/api.ts.

On the session-result display (wherever Phase 1/2 data is shown, per Prompt 2), add
small badges reflecting stt_source ("Groq" vs "Offline model") and feedback_source
("Gemini" vs "Template") so it's visible per-session which path was used — style these
as small pill labels consistent with the existing status-badge style already used
elsewhere in the app (see the colored pill badges in app/sessions/page.tsx for the
pattern to match).

Done when: forcing the backend offline changes the Settings indicator to "Local host
(offline)", and a session run in that state shows both badges as their fallback values.
```

---

**Prompt 7 — The Reading Buddy (net-new kid-facing screen)**
```
Create a new route app/read/page.tsx (or app/read/[sessionId]/page.tsx if session
continuity across page loads matters) — a checkpoint-driven, kid-facing reading
experience, visually distinct from the teacher-console Dashboard: larger type, more
playful color use from the existing accent-primary/accent-secondary palette already
defined in globals.css (don't invent new colors), minimal chrome, no data tables or
technical labels anywhere on screen.

Reuse the existing mic-recording logic already proven in SpeakFlowContext
(recordAndAnalyzeCheckpoint from Prompt 2) — don't reimplement audio capture.

Flow: show the current checkpoint's target_text prominently → student taps a large
record button → on Phase 1 response, show simple pass/fail feedback per word (a big
checkmark or a gentle highlight on the specific word/phoneme that needs another try,
not a technical mismatch label) → on advancing past all checkpoints in the session,
show a simple completion/celebration state.

This screen must work in both languages (respect the RTL/font handling from Prompt 5)
and must not show stt_source/feedback_source badges, latency numbers, or any other
teacher-facing technical detail — those stay exclusive to the Dashboard/Settings/Agents
pages.

Done when: a full checkpoint sequence (record → see per-word feedback → advance →
repeat → completion state) can be run start to finish by someone unfamiliar with the
app, with no visible technical/debug information on screen at any point.
```

---

**Prompt 8 — Parent WhatsApp/SMS example message**
```
Add a small static "Share Update" card component (components/dashboard/ParentUpdateCard.tsx
or similar, matching the existing speakflow-card style) showing one example parent
update message in Urdu, styled to resemble a WhatsApp message bubble. This is a single
hardcoded example, not a live-send feature — no button should claim to actually send
anything; if a button is included, it should say something like "Preview only" or be
omitted entirely in favor of just displaying the example.

Place it on the Students page (app/students/page.tsx) near a student's row detail, or
as a section on the Dashboard — pick whichever fits without disrupting the existing
grid layout most.

Done when: the card renders the example message in Urdu with correct RTL rendering
(reuse the font/direction handling from Prompt 5), and nothing on the card implies a
live send capability that doesn't exist.
```

---

**Prompt 9 — Real educator class-wide dashboard**
```
Replace the current ProgressChart component's reliance on lib/mockData.ts with a real
data view fed by fetchStudentDashboard() from lib/api.ts (Prompt 1), for the
GET /students/{id}/dashboard endpoint.

Build a per-sound error-rate heatmap (a simple colored grid — sound/phoneme labels on
one axis, error frequency as color intensity — recharts or a plain CSS grid, whichever
is simpler to get correct first) alongside the existing WPM/accuracy trend line (which
can stay as a recharts LineChart in the same style as today, just fed by real data
instead of MOCK_SESSION_DATA).

Keep this on the existing /progress route, but add a student/class selector if the
dashboard endpoint supports viewing more than one student — if only single-student data
is available by demo day, note that limitation in the UI copy rather than faking a
class-wide view with one student's repeated data.

Done when: this page renders real data from an actual API response with no import of
MOCK_SESSION_DATA remaining anywhere in the codebase (grep for it to confirm).
```

---

**Prompt 10 — Full integration pass**
```
Audit every page against the current state of context/SpeakFlowContext.tsx and
lib/api.ts (post Prompts 1–9). Specifically check:

- app/dashboard/page.tsx and its cards (LiveReadingCard, SessionSummaryCard,
  AIDiagnosisCard, PracticeCard) for any remaining reference to the old `agents` array,
  `diagnosis` object, or 5-fixed-ID agent model — replace with the new checkpoint/phase
  based state.
- app/sessions/page.tsx — fix the hardcoded "1m 12s" duration column to use real data,
  and wire the row-click handler to a real session detail view instead of just a toast.
- Confirm no file in the project still imports or references runPipeline (removed in
  Prompt 1) or MOCK_SESSION_DATA (removed in Prompt 9).
- Confirm the warnings array and error envelope from the API contract are surfaced
  somewhere visible (e.g. as a toast via addNotification) whenever a response includes
  them, rather than silently ignored.

Done when: a full session — teacher console AND the /read Reading Buddy flow — runs
against the real backend end to end with no console errors, no references to removed
old-contract fields anywhere in the codebase (grep to confirm), and every warning/error
the backend can return is visibly surfaced somewhere in the UI.
```
