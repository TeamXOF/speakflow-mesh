# SpeakFlow — Full Roadmap, Architecture & Antigravity Build Prompts

Backend-only. Frontend is out of scope — built separately in Google AI Studio and integrates purely through the REST contract in Part 1.2.

**Locked stack (recap for self-containment):**
- STT online: Groq Whisper API
- STT offline: local quantized Whisper (whisper.cpp / faster-whisper, INT8)
- Acoustic evidence: librosa (pitch, formants, ZCR, spectral energy)
- Phoneme dictionary: PronouncUR-assisted Urdu G2P + manual native-speaker overrides, plus curated English targets
- Reasoning layer: Gemini 3.5 Flash-Lite (feedback text + hesitation judgment on raw audio) — replacing Qwen
- Backend: Python
- Persistence: local SQLite, ephemeral audio (never persisted)

---

## Part 1 — Complete Architecture

### 1.1 System Diagram (text)

```
                              ┌─────────────────────────────┐
                              │   FRONTEND (Google AI Studio) │
                              │   — out of scope, consumes    │
                              │     the REST contract below   │
                              └───────────────┬───────────────┘
                                              │ HTTPS (online) or LAN (offline)
                              ┌───────────────▼───────────────┐
                              │        MODE ROUTER            │
                              │  GET /api/v1/health decides    │
                              │  which branch below is live    │
                              └───────┬───────────────┬───────┘
                        ONLINE PATH   │               │   OFFLINE PATH
                                      ▼               ▼
                    ┌─────────────────────┐   ┌─────────────────────┐
                    │  Cloud/Dev Backend   │   │ Local Teacher-Host   │
                    │  (same codebase)     │   │ Backend (same code,  │
                    │                      │   │ run on teacher laptop)│
                    └─────────┬────────────┘   └─────────┬────────────┘
                              │                           │
              ┌───────────────┴───────────────┐          │
              │                               │          │
    1. STT: Groq Whisper API          (fallback if Groq  │  1. STT: local quantized
       (audio → transcript +          rate-limited/down) │     Whisper (no network)
       word timestamps)                       │           │
              │                               ▼          ▼
              │                    2. Local quantized Whisper
              │                       (same function used by
              │                       offline path — see 1.3)
              │
              ▼
    2. librosa Acoustic Engine (always local, both paths)
       pitch / formants / ZCR / spectral energy
       → compared against Phoneme Reference Dictionary
       (PronouncUR-assisted + manual overrides, loaded at boot)
              │
              ▼
    3. Comparison/Scoring Engine (pure Python, no external call)
       → per-word accuracy, phoneme mismatch list, WPM,
         pause/hesitation timing
              │
              ├─────────────── PHASE 1 RESPONSE (fast path, ~400ms) ────────────►
              │                returned to frontend immediately: correctness +
              │                per-word flags, so checkpoint UI updates fast
              │
              ▼
    4a. Gemini 3.5 Flash-Lite — feedback text          4b. Gemini 3.5 Flash-Lite —
        (structured mismatch JSON → text-only call)        hesitation judgment
        ONLY if online.                                    (raw audio clip, only
        Offline/rate-limited → template bank fallback       fires on ambiguous pause,
                                                             only if online)
              │                                              │
              └─────────────────┬────────────────────────────┘
                                 ▼
                   PHASE 2 RESPONSE (async, pushed via
                   WebSocket or polled) — feedback text,
                   engagement state, practice recommendation
                                 │
                                 ▼
                   5. Persistence: aggregated metrics only
                      (SQLite) — audio discarded after step 2/3.
                      Offline sessions queued with unsynced=true.
                                 │
                                 ▼
                   6. Sync-on-Reconnect (background job, see 1.3)
                      pushes queued local sessions to cloud store
                      once connectivity returns.
```

**External API calls (the only two — everything else is local):**
1. Groq Whisper API — online STT only.
2. Google AI Studio Gemini API — feedback generation (text-only) + hesitation judgment (audio+text, multimodal). Both calls only fire when online; both have a defined non-LLM fallback (Part 2.5).

PronouncUR is a **build-time** tool (runs once during dictionary curation), not a runtime dependency — it never appears in the request path above.

### 1.2 API Contract (for the Google AI Studio frontend team)

Base URL: `http://<host>:<port>/api/v1` (host is `localhost`/LAN IP in offline mode, cloud domain in online mode — frontend gets this from `GET /health`, never hardcodes it).

All responses are JSON. All error responses share one envelope:

```json
{
  "error": {
    "code": "GROQ_UNAVAILABLE",
    "message": "Speech-to-text service unavailable, used local fallback.",
    "retryable": false
  }
}
```

`code` is a fixed enum the frontend can switch on: `VALIDATION_ERROR`, `SESSION_NOT_FOUND`, `AUDIO_TOO_SHORT`, `GROQ_UNAVAILABLE`, `GEMINI_UNAVAILABLE`, `INTERNAL_ERROR`. Note: `GROQ_UNAVAILABLE`/`GEMINI_UNAVAILABLE` are **informational, not blocking** — the fallback already ran and the main response still succeeds with a 200; these only appear in a `warnings` array (see below), never as a hard error, unless *both* the primary and local fallback failed.

---

**`GET /health`**
Returns current mode so the frontend knows which backend it's talking to and whether to expect Phase-2 feedback at all.

```json
{
  "mode": "online" | "offline",
  "groq_reachable": true,
  "gemini_reachable": true,
  "server_time": "2026-09-02T10:15:00Z"
}
```

---

**`POST /sessions`**
Creates a reading session for one student on one story/checkpoint set.

Request:
```json
{
  "student_id": "stu_042",
  "story_id": "story_forest_01",
  "language": "en" | "ur"
}
```

Response `201`:
```json
{
  "session_id": "sess_9f3a",
  "student_id": "stu_042",
  "story_id": "story_forest_01",
  "created_at": "2026-09-02T10:15:00Z",
  "checkpoints": [
    { "checkpoint_id": "cp_1", "target_text": "The fox ran fast." }
  ]
}
```

---

**`POST /sessions/{session_id}/analyze`**
Core endpoint. Submits one checkpoint's audio for analysis. `multipart/form-data`.

Request fields:
| field | type | notes |
|---|---|---|
| `audio` | file (webm/wav) | required |
| `checkpoint_id` | string | required, must match a checkpoint on this session |

**Phase 1 response — `202` immediately, then this JSON as soon as the fast path finishes (~400ms target):**
```json
{
  "session_id": "sess_9f3a",
  "checkpoint_id": "cp_1",
  "phase": 1,
  "transcript": "the fox ran fast",
  "words": [
    { "word": "the", "correct": true, "phoneme_mismatch": null },
    { "word": "fox", "correct": false, "phoneme_mismatch": "f_vs_v" }
  ],
  "wpm": 62,
  "hesitations": [ { "after_word": "fox", "pause_ms": 850, "flagged_ambiguous": true } ],
  "stt_source": "groq" | "local_fallback",
  "latency_ms": { "stt": 190, "acoustic": 110, "scoring": 25, "total_phase1": 395 },
  "warnings": []
}
```

**Phase 2 — pushed over the same session's WebSocket channel (`/ws/sessions/{session_id}`) when Gemini finishes, OR fetched by polling `GET /sessions/{session_id}/feedback/{checkpoint_id}` if the frontend prefers polling over WebSocket:**
```json
{
  "session_id": "sess_9f3a",
  "checkpoint_id": "cp_1",
  "phase": 2,
  "feedback_text": "Great job on 'the' and 'ran'! Let's try 'fox' — feel the 'f' sound with your top teeth on your lip.",
  "engagement_state": "confident" | "anxious" | "frustrated" | "unknown",
  "comprehension_question": "What animal ran in the story?",
  "practice_recommendation": null,
  "feedback_source": "gemini" | "template_fallback",
  "latency_ms": { "gemini_feedback": 240, "gemini_hesitation": 210 }
}
```

If offline or Gemini unreachable, Phase 2 still fires (from the template bank) — the frontend never needs special-case logic for "no Phase 2 came," only for reading `feedback_source`.

---

**`GET /sessions/{session_id}`** — session summary/progress across checkpoints (for the reading-buddy UI's progress state).

**`GET /students/{student_id}/dashboard`** — aggregated data for the educator dashboard (Feature 8): per-sound class-wide error rates, individual trend lines. Query params: `?range=session|week|all`.

**`POST /sync`** — manually trigger sync of queued offline sessions (also runs automatically on reconnect detection — see 1.3). Response includes `{ "synced_count": N, "failed_count": 0 }`.

### 1.3 Online/Offline Branching & Sync-on-Reconnect

**Branch decision point:** a single `get_transcript(audio)` wrapper function is the only place STT source is decided. It is not a global online/offline flag checked everywhere — every other component (librosa, scoring, dictionary) is identical on both paths and doesn't know or care which mode it's in.

```
get_transcript(audio):
    if network_available():
        try: return groq_whisper(audio), source="groq"
        except (RateLimitError, TimeoutError, ConnectionError):
            log_fallback("groq", reason)
            return local_whisper(audio), source="local_fallback"
    else:
        return local_whisper(audio), source="local_fallback"
```

Same pattern for feedback: `get_feedback(mismatch_data)` tries Gemini, falls back to the template bank on any failure or on `network_available() == False`. Both wrapper functions are the *only* fallback logic in the system — every downstream consumer just reads `source`/`feedback_source` off the response, it never branches on connectivity itself.

**`network_available()`** is a lightweight, cached (5s TTL) check — not a call to Groq/Gemini themselves, but a cheap reachability probe (e.g. DNS resolution or a HEAD request to a stable endpoint) so a slow/degraded connection doesn't get treated as "online" and then time out on every real call.

**Local mesh (offline path):** the teacher's laptop runs the exact same backend binary in "local-host" mode — a WebSocket server bound to the LAN IP. Student devices (or the same device, browser-based) connect as WebSocket clients. No code fork: the same `/sessions/{id}/analyze` logic runs, `get_transcript`/`get_feedback` simply resolve to their fallback branches because `network_available()` returns false.

**Sync-on-reconnect:**
1. Every session/checkpoint result written offline is tagged `synced: false` in local SQLite, with a `local_created_at` timestamp.
2. A background thread checks `network_available()` every 30s. On the false→true transition, it triggers sync.
3. Sync pushes each `synced: false` record to the cloud store's `/internal/sync-ingest` endpoint (server-to-server, not the public contract) via its `session_id` — cloud store treats `session_id` as the idempotency key, so a re-sent record after a partial failure just overwrites, never duplicates.
4. Feedback text is **not** regenerated on sync — the template-bank text stays as the permanent record for that checkpoint. (Scope decision: retroactive Gemini upgrade adds complexity and a second source of truth for no demo-visible benefit.)
5. On success, local record flips to `synced: true`; on failure, it stays queued and retries next cycle. `POST /sync` lets the teacher force this manually (e.g. right before packing up, to confirm before leaving the building).

---

## Part 2 — Core Fundamentals

### 2.1 Correctness

**What "correct" means, numerically:** each target word/sound has a reference vector — a small set of expected values for pitch contour shape, formant frequencies (F1/F2 for vowels), zero-crossing rate, and spectral energy distribution, captured from a clean native-speaker reference recording during dictionary curation. A student's attempt is scored by computing the deviation of their extracted features from that reference vector (e.g. normalized distance per feature, combined into one composite score 0–100). A word is marked `correct: true` above a threshold (starting point: **70/100** composite score) — but this number is a tuning knob, not a fixed truth. It gets calibrated in Part 3, Day 1, Hour 6–7 against real recordings before it's trusted for the demo.

**Testing the curated list before the demo:** every word/sound in the demo list gets recorded by (a) at least one native-speaker-correct reference, and (b) 2–3 deliberately-wrong attempts (a team member mispronouncing it on purpose) and 2–3 correct attempts from different speakers. Run all of them through the pipeline and build a small confusion matrix (correct-marked-correct, correct-marked-wrong, wrong-marked-correct, wrong-marked-wrong) per word. Any word whose behavior isn't stable and roughly matches expectation gets **dropped from the demo path** — even if it's in the dictionary — rather than risked live. This is the same audit discipline as the BUILT/TO BUILD/ROADMAP-ONLY tagging: a word only earns "demo-ready" after it's measured, not assumed.

**False positive vs. false negative, and how each is handled:**
- **False positive** (flags a correct reading as wrong): the more damaging failure live, since it can visibly discourage a correctly-reading child in front of judges. Threshold is deliberately biased conservative (i.e., a slightly higher bar to be marked wrong) to minimize this, accepting more false negatives as the trade-off.
- **False negative** (misses a real mispronunciation): lower-stakes for the demo — a missed correction doesn't produce a visibly bad moment on stage. Acceptable to under-flag rather than over-flag.
- Both rates get a rough estimate from the confusion-matrix testing above; there's no target precision/recall number claimed beyond "measured and directionally reasonable" — this is a 3-day hackathon calibration, not a validated clinical instrument, and the feedback text/dashboard framing should never imply otherwise (consistent with the PRD's "screening flag, not diagnosis" framing already locked for Feature 5).

### 2.2 Design Principles — Separation of Concerns

| Layer | Job | Does NOT do |
|---|---|---|
| STT (Groq / local Whisper) | audio → text + word timestamps | judge correctness, do acoustic math |
| Acoustic evidence (librosa) | raw signal → pitch/formant/ZCR/energy | know what a word "means," generate language |
| Reference dictionary (PronouncUR + overrides) | static lookup: word/sound → target vector | process live audio at all — build-time artifact |
| Reasoning (Gemini) | turn structured error data into language; judge ambiguous pauses from audio | compute acoustic accuracy itself |

**Why each boundary exists:** each layer is independently testable and independently swappable. If STT is wrong, you can prove it by comparing its transcript to ground truth without touching librosa. If a phoneme score is wrong, you can prove it by feeding the same audio through librosa standalone. If feedback text is bad, you can iterate on the Gemini prompt without re-running the acoustic pipeline. This is also what keeps the "genuine acoustic evidence" claim defensible under judge questioning — every number the system produces traces to a specific, inspectable layer, not a black-box LLM call.

**What breaks if two are merged carelessly:**
- **Gemini doing acoustic scoring directly** (e.g. "just send Gemini the audio and ask if it's right"): loses the auditable evidence trail, reintroduces the "isn't this just an LLM with a mic?" critique this architecture was built to avoid, and makes false positives/negatives untunable — you can't threshold-adjust a black box the way you can a composite score formula.
- **STT and librosa merged into one step** (e.g. one library doing both): you lose the ability to independently calibrate each layer, and when a result is wrong, you can no longer tell whether it's a transcription error or an acoustic-threshold miscalibration — which matters a lot when debugging Day 1's calibration pass.

### 2.3 Latency Budget (<800ms target)

Two-phase response design is what makes the budget achievable without blocking: the child-facing "was this right?" indicator only waits on Phase 1; feedback text (Phase 2) delivers async and is allowed to take longer without anyone perceiving lag.

| Stage | Budget | Blocking? |
|---|---|---|
| Network/upload overhead | 50ms | Phase 1 |
| STT (Groq, or local fallback) | 200ms | Phase 1 |
| librosa feature extraction | 120ms | Phase 1 |
| Phoneme comparison/scoring (pure Python) | 30ms | Phase 1 |
| Response assembly | 20ms | Phase 1 |
| **Phase 1 subtotal** | **~420ms** | **blocking, must hit <800ms even with jitter** |
| Gemini feedback generation | ~250ms | Phase 2, async |
| Gemini hesitation judgment (only on ambiguous pause) | ~250ms | Phase 2, async |

**When a component is slow:** Phase 1 never waits on Gemini — it's architecturally impossible for Gemini latency to blow the 800ms budget, because Gemini isn't in the Phase 1 path at all. Within Phase 1 itself, each sub-call gets a hard timeout (STT: 600ms, after which it's treated as a Groq failure and falls back to local Whisper — see 2.5) so one slow external call can't silently eat the whole budget. Phase 2 has no hard user-facing budget, but a soft one: if Gemini hasn't responded in ~1.5s, the template fallback fires anyway so the child isn't left waiting on feedback text.

### 2.4 Privacy & Data Handling

- **Raw audio is ephemeral by design.** It exists only as an in-memory buffer / short-lived temp file for the duration of one `/analyze` request. It's deleted immediately after STT + librosa extraction complete (both consume it in the same request lifecycle) — never written to persistent storage, never included in the SQLite record.
- **What's persisted:** aggregated numeric results only — per-word correctness, WPM, hesitation flags, mismatch phoneme labels, generated feedback text, engagement state. No raw audio, no raw waveform data, at rest anywhere.
- **The one exception, called out explicitly:** the hesitation-judgment Gemini call (4b) sends a raw audio clip to Google's API for that single inference. This is the most sensitive external egress point in the system and is worth flagging on its own — it leaves the ephemeral-audio guarantee intact locally (the clip still isn't stored by *us*), but it does mean a third-party API receives child audio, even briefly. If the child-data privacy requirement in the PRD is strict about third-party egress, this specific call is the one to review before demo day, not the pipeline as a whole.
- This matches the "screening flag, not diagnosis" posture already locked for Feature 5 — nothing here is framed or stored as a clinical record.

### 2.5 Error Handling & Fallback Logic

Two fallback wrappers, already introduced in 1.3, are the entire strategy — no other part of the system has bespoke error handling:

```
get_transcript(audio):
    try Groq (600ms timeout) → on RateLimitError/TimeoutError/ConnectionError
    → fall back to local quantized Whisper
    → tag response stt_source="local_fallback"
    → log(timestamp, "groq_fallback", reason)

get_feedback(mismatch_data):
    try Gemini (1.5s soft timeout) → on any failure or offline
    → fall back to template bank, keyed by mismatch_type/hesitation_type
    → tag response feedback_source="template_fallback"
    → log(timestamp, "gemini_fallback", reason)
```

Rules that apply to both:
- **Never surface a raw exception to the child-facing UI.** The `source`/`feedback_source` fields are the only visible trace, and they're only shown in a teacher/debug view, not the student view.
- **Never block on the failing call longer than its defined timeout.** Fallback fires on timeout, not on waiting indefinitely for an eventual response.
- **Always log** every fallback event with timestamp and reason — this is what makes "did our free-tier quota get hit mid-demo" answerable after the fact instead of a mystery.
- **Fallbacks degrade gracefully, they don't degrade the core claim.** Even on local_fallback + template_fallback simultaneously (full offline), the system still produces the genuine acoustic-evidence score — only the STT source and the feedback *language* change, never the correctness judgment itself.

---

## Part 3 — Build Roadmap

### Day 1 (load-bearing — hour by hour)

| Hours | Task | Verified by (not assumed) |
|---|---|---|
| 0–1 | Scaffold: folder structure, env/config, separate dev vs. demo-day API keys for Groq + Gemini | Server boots; `/health` returns 200; both API keys validated with one trivial test call each |
| 1–3 | Groq Whisper integration | Transcript matches expected text on 3 test recordings; word timestamps present and monotonic |
| 3–5 | librosa acoustic engine: pitch/formant/ZCR/energy extraction | Output values are in plausible numeric range (no NaN/zero) on test recordings; a known-wrong recording produces a measurably different score from a known-correct one |
| 5–6 | Phoneme dictionary: run PronouncUR on word list, hand-verify high-stakes phonemes with a native speaker, load as reference vectors | Dictionary loads without error; 5 spot-checked words confirmed against native-speaker sign-off |
| 6–7 | Comparison/scoring engine + threshold calibration (2.1) | Confusion matrix built from test recordings; false-positive rate estimated and threshold adjusted to bias against it |
| 7–8 | Gemini feedback-text integration (text-only call) | 5 sample structured inputs produce on-topic, age-appropriate feedback text; latency logged |
| 8–9 | Gemini hesitation-judgment integration (multimodal audio call) | 3 ambiguous-pause recordings correctly classified nervous-vs-not-knowing by team review; fallback path tested by disabling the call |
| 9–10 | Wire full pipeline end-to-end (STT → librosa → scoring → Gemini) as one internal call path | One full round-trip test, audio in → complete JSON out; actual latency measured against the 420ms Phase-1 / ~800ms total budget |
| 10–11 | Fallback wiring: force-fail Groq and Gemini independently (bad key / simulated timeout) | Both fallbacks fire correctly, no crash, correct `source`/`feedback_source` tags in output |
| 11–12 | Buffer + start REST layer skeleton so Day 2 isn't starting cold | `/sessions/{id}/analyze` reachable, returns full contract-shaped JSON for one test case |

**Day 1 exit criterion:** the core pipeline (audio in → scored, feedback-bearing JSON out) works end-to-end, has measured (not assumed) accuracy behavior on the demo word list, and degrades gracefully when either external API is killed. If this isn't true by end of Day 1, Day 2 scope gets cut, not Day 1's calibration step.

### Day 2

- REST API layer: complete all contract endpoints from 1.2 (`/sessions`, `/sessions/{id}`, `/students/{id}/dashboard`, `/sync`).
- Offline local mesh: WebSocket host mode, `network_available()` detection, wiring local quantized Whisper + template bank into the existing `get_transcript`/`get_feedback` wrappers (no new logic — same functions, different branch).
- Checkpoint/session state machine backing the gamified reading buddy (backend side only — advancing checkpoints on correct reads, exposing state via `/sessions/{id}`).
- Dashboard aggregation endpoint (per-sound class-wide error rates from stored session data).
- **Verification, not vibes:** run one full session through both the online REST path and the offline WebSocket path and confirm identical response shape from both.

### Day 3

- Sync-on-reconnect: implement and test the false→true `network_available()` transition trigger; verify a queued offline session appears correctly in the cloud dashboard after reconnect, with no duplication on a forced retry.
- Latency logging/instrumentation across every stage (turn the Part 2.3 budget table into actual per-request logged numbers).
- End-to-end integration with the Google AI Studio frontend once available — confirm every contract field the frontend expects is actually populated, not just present.
- Full demo dry-run against the curated word list; freeze scope — anything not verified working by this point does not go in the pitch, per the existing BUILT/TO BUILD/ROADMAP-ONLY discipline.
- Buffer for fixes surfaced by the dry-run.

---

## Part 4 — Antigravity Build Prompts

Ten discrete, self-contained prompts, in build order. Each is meant to be pasted as-is into Antigravity — paste, run, verify against the stated test, then move to the next.

---

**Prompt 1 — Project scaffold + config**
```
Create a Python backend project for "SpeakFlow" with this structure:
  /app
    /api          (route handlers, empty for now)
    /core          (config, env loading)
    /services      (stt/, acoustic/, dictionary/, reasoning/ — empty subpackages)
    /storage       (sqlite setup)
  main.py          (FastAPI app entrypoint)
  .env.example     (GROQ_API_KEY, GEMINI_API_KEY, GEMINI_API_KEY_DEMO, ENV=dev|demo)
  requirements.txt (fastapi, uvicorn, python-dotenv, librosa, sqlite3-compatible ORM of your choice)

Load config from .env via a single Settings object in /app/core/config.py — never read
os.environ directly elsewhere in the codebase.

Add a GET /api/v1/health endpoint that returns:
  { "mode": "online", "groq_reachable": null, "gemini_reachable": null, "server_time": <iso8601> }
(reachability checks are stubbed true/null for now — wired for real in Prompt 10).

Done when: `uvicorn main:app` boots without error, and GET /api/v1/health returns 200
with the shape above.
```

---

**Prompt 2 — Groq Whisper integration (online STT)**
```
In /app/services/stt/, implement groq_whisper(audio_bytes) -> TranscriptResult, where
TranscriptResult has: text (str), words (list of {word, start_ms, end_ms}).
Use the Groq Whisper API with the key from Settings.GROQ_API_KEY. Set a 600ms request
timeout.

Add a temporary test script /scripts/test_groq.py that sends 3 sample WAV files
(place placeholders at /test_audio/sample_1.wav etc. — note in a comment that real
recordings get dropped in during Day 1 Hour 1-3) and prints the transcript + word
timestamps for each.

Done when: running test_groq.py against 3 real recordings produces transcripts that
match the expected text, and every word entry has start_ms < end_ms and is
monotonically increasing across the word list.
```

---

**Prompt 3 — librosa acoustic feature extraction + comparison engine**
```
In /app/services/acoustic/, implement:
  extract_features(audio_bytes, word_timespan) -> FeatureVector
    (pitch contour, F1/F2 formants, zero-crossing rate, spectral energy — using librosa)
  score_against_reference(feature_vector, reference_vector) -> float (0-100 composite score)
    using normalized per-feature deviation, weighted equally unless a weighting scheme
    is specified later. Composite score >= 70 => correct=True (this threshold must be
    read from a config constant, not hardcoded inline, since it gets calibrated in
    Prompt 4/Day 1 Hour 6-7).

Add /scripts/test_acoustic.py that runs extract_features on the same 3 sample
recordings from Prompt 2, plus 2-3 deliberately-mispronounced recordings of the same
words (placeholders noted for later real recordings), and prints each composite score.

Done when: correct recordings score measurably higher than deliberately-wrong ones for
the same word — a real, inspectable gap, not just non-crashing output.
```

---

**Prompt 4 — Urdu + English phoneme dictionary integration**
```
In /app/services/dictionary/, implement a ReferenceDictionary that loads a JSON file
(/data/phoneme_dictionary.json) mapping word/sound -> reference FeatureVector (matching
the shape from Prompt 3), for both English and Urdu entries.

Add /scripts/build_dictionary.py that documents (as comments, not executable PronouncUR
integration — that runs separately as a build-time tool) the expected JSON shape each
PronouncUR-generated entry must be hand-converted into, plus a manual_overrides.json
that takes precedence over auto-generated entries for any word listed in it.

Wire ReferenceDictionary into score_against_reference from Prompt 3 so a word lookup by
(word, language) returns the right reference vector.

Done when: the dictionary loads without error, and looking up 5 spot-checked words
(3 English, 2 Urdu including one ق/ک pair) returns the hand-verified reference vector,
confirmed by printing and manually comparing against the native-speaker sign-off sheet.
```

---

**Prompt 5 — Gemini 3.5 Flash-Lite integration (feedback + hesitation judgment)**
```
In /app/services/reasoning/, implement two functions:

  generate_feedback(mismatch_data: dict) -> str
    Text-only call to Gemini 3.5 Flash-Lite (Settings.GEMINI_API_KEY). Prompt should
    take the structured per-word correctness + mismatch data from Prompt 3/4 and return
    encouraging, age-appropriate feedback text for an elementary student. 1.5s soft
    timeout.

  judge_hesitation(audio_bytes, pause_context: dict) -> "nervous" | "not_knowing"
    Multimodal call sending the raw audio clip around the pause plus timing context,
    asking Gemini to classify it. Only called when pause_ms exceeds a configurable
    threshold (start at 400ms, matching the existing pause-flagging heuristic).

Both functions must raise a distinguishable exception type on failure/timeout (not a
bare Exception) so Prompt 10's fallback wrapper can catch specifically these.

Done when: 5 sample mismatch_data inputs produce coherent, on-topic feedback text
(manually reviewed), and 3 ambiguous real pause recordings get a hesitation
classification that the team agrees with on manual review.
```

---

**Prompt 6 — Local quantized Whisper fallback + offline detection**
```
In /app/services/stt/, implement local_whisper(audio_bytes) -> TranscriptResult (same
return shape as groq_whisper from Prompt 2), using a quantized INT8 model via
whisper.cpp or faster-whisper, loaded once at server startup (not per-request).

In /app/core/, implement network_available() -> bool: a cheap reachability probe
(e.g. DNS resolution to a stable host, NOT a call to Groq/Gemini themselves), cached
with a 5-second TTL so repeated calls within that window don't re-probe.

Done when: local_whisper produces a transcript for the same 3 test recordings from
Prompt 2 (lower accuracy than Groq is expected and fine — it just needs to run and
return the right shape), and network_available() correctly returns false when the
machine's network interface is manually disabled for a test.
```

---

**Prompt 7 — WebSocket local mesh (teacher-host ↔ student-client)**
```
Add a WebSocket endpoint /ws/sessions/{session_id} to the FastAPI app that the same
backend binary serves whether it's running as the cloud/dev server or in "local-host"
mode on a teacher's laptop (no separate codepath — same route, same handlers).

The route should accept audio chunks from a connected client, run them through the
existing analyze pipeline (Prompts 2-5, via the get_transcript/get_feedback pattern
that Prompt 10 will formalize), and push Phase 1 then Phase 2 results back over the
same socket as two separate JSON messages.

Add a CLI flag --local-host that binds the server to the machine's LAN IP instead of
localhost, for the offline classroom scenario.

Done when: a WebSocket test client (script or wscat) connects, sends one audio chunk,
and receives two distinct JSON messages back (Phase 1 then Phase 2) matching the
schemas in the API contract.
```

---

**Prompt 8 — Cloud sync-on-reconnect logic**
```
In /app/storage/, add a `synced` boolean column and `local_created_at` timestamp to the
session/checkpoint result table. Every write made while network_available() is false
gets synced=false.

Implement a background thread/task that checks network_available() every 30 seconds
and, on a false→true transition, POSTs every synced=false record to an internal
/internal/sync-ingest endpoint, keyed by session_id as an idempotency key (re-sending
an already-synced session_id overwrites rather than duplicates).

Add POST /api/v1/sync as a manual trigger for the same logic, returning
{ "synced_count": N, "failed_count": N }.

Done when: (1) a record written with the network artificially disabled shows
synced=false, (2) re-enabling the network triggers a sync within 30s and the record
flips to synced=true, (3) manually calling POST /sync with nothing queued returns
synced_count=0 without error.
```

---

**Prompt 9 — REST API layer (full documented contract)**
```
Implement the remaining REST endpoints from the SpeakFlow API contract exactly as
specified (field names, types, and status codes matter — this is consumed by a
frontend team with no backend context):

  POST /api/v1/sessions
  POST /api/v1/sessions/{session_id}/analyze   (multipart/form-data: audio, checkpoint_id;
                                                  returns Phase 1 JSON per the contract,
                                                  Phase 2 delivered via the existing
                                                  WebSocket channel from Prompt 7)
  GET  /api/v1/sessions/{session_id}
  GET  /api/v1/students/{student_id}/dashboard?range=session|week|all
  GET  /api/v1/sessions/{session_id}/feedback/{checkpoint_id}   (polling alternative to WS)

All error responses use the shared envelope: { "error": { "code", "message", "retryable" } }
with code values limited to: VALIDATION_ERROR, SESSION_NOT_FOUND, AUDIO_TOO_SHORT,
GROQ_UNAVAILABLE, GEMINI_UNAVAILABLE, INTERNAL_ERROR.

Done when: a Postman/curl collection hitting every endpoint above returns responses
matching the documented shape exactly (run a JSON-schema check against the contract,
not a manual eyeball), including at least one deliberately-triggered error response
per endpoint.
```

---

**Prompt 10 — Error handling, rate-limit fallback, and latency logging (system-wide)**
```
Formalize the two fallback wrappers referenced throughout the build:

  get_transcript(audio) -> tries groq_whisper (Prompt 2) with a 600ms timeout, catches
  RateLimitError/TimeoutError/ConnectionError specifically, falls back to local_whisper
  (Prompt 6), tags result stt_source="groq"|"local_fallback", and logs
  (timestamp, "groq_fallback", reason) on fallback.

  get_feedback(mismatch_data) -> tries generate_feedback (Prompt 5) with a 1.5s soft
  timeout, catches its distinguishable exception type, falls back to a template bank
  (/data/feedback_templates.json, keyed by mismatch_type), tags result
  feedback_source="gemini"|"template_fallback", logs the same way.

Replace every direct call to groq_whisper/local_whisper and generate_feedback
elsewhere in the codebase (Prompts 2-9) with calls to these two wrappers instead —
no other component should contain its own try/except around these external calls.

Add per-request latency logging (per the Part 2.3 budget table stages: network,
stt, acoustic, scoring, response-assembly for Phase 1; gemini_feedback,
gemini_hesitation for Phase 2), written to a simple log table/file queryable after a
demo run.

Done when: (1) forcing a bad Groq key produces a response with stt_source="local_fallback"
and a logged fallback event, with no exception surfaced past the wrapper; (2) same test
for a bad Gemini key produces feedback_source="template_fallback"; (3) a full
end-to-end request produces a latency log entry with all stages populated and a total
Phase 1 time under 800ms.
```
