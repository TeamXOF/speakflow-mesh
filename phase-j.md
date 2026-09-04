# Phase J: Fallbacks, Latency Logging & System Hardening

## Goal
Implement robust wrapper functions with fallbacks for AI services (STT and Gemini), log per-request latency into a queryable table, and update the health endpoint to reflect true backend reachability.

## Tasks
- [ ] Task 1: **Implement `get_transcript` Wrapper**
  - Create a new service wrapper that tries `groq_whisper` first, falls back to `local_whisper` if it fails, and tags the result with `stt_source` ("groq" or "local_fallback").
  - Replace all direct `groq_whisper` and `local_whisper` calls in `sessions.py` with `get_transcript`.
  - **Verify**: Change GROQ_API_KEY to garbage, verify `stt_source` is `local_fallback` in Phase 1 response.

- [ ] Task 2: **Implement `get_feedback` Wrapper**
  - Create a new service wrapper that tries `generate_feedback` (Gemini), falls back to a template bank on failure, and tags the result with `feedback_source` ("gemini" or "template_fallback").
  - Replace the direct Gemini call in `sessions.py` Phase 2 background task.
  - **Verify**: Change GEMINI_API_KEY to garbage, verify `feedback_source` is `template_fallback`.

- [ ] Task 3: **Latency Logging to SQLite**
  - Add a `latency_logs` table schema to `database.py`.
  - Create an insertion function to record `session_id`, `stt_ms`, `acoustic_ms`, `scoring_ms`, and `gemini_ms`.
  - Wire it into `sessions.py` to save latency metrics asynchronously.
  - **Verify**: Inspect `speakflow.db` to ensure latency records are saved after a session.

- [ ] Task 4: **Real Reachability in `/health`**
  - Update `GET /api/v1/health` in `main.py`.
  - Add quick HTTP ping checks to `api.groq.com` and `generativelanguage.googleapis.com` (timeout=1s) to determine true `groq_reachable` and `gemini_reachable` states.
  - **Verify**: Calling `/health` returns accurate booleans for reachability instead of `null`.

## Done When
- [ ] Fallbacks operate seamlessly when API keys are invalid.
- [ ] Latency is logged automatically for each run.
- [ ] Health endpoint returns correct reachability flags.

## Notes
- Ensure fallback mechanisms handle timeouts (e.g. 503 from Groq) elegantly so the UI doesn't hang.
