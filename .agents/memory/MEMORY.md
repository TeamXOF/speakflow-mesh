# Memory Index

## Project
- [project] Always create a new dedicated branch for major code changes → project-conventions.md
- [project] AG Kit only supports Gemini CLI and Google Antigravity (not other AI coding tools) → project-conventions.md
- [project] Component metadata uses SemVer while toolkit releases use CalVer → tech-decisions.md
- [session] Setup comprehensive frontend and backend ROADMAP.md, corrected project name from 'SpeakFlow Mesh' to 'SpeakFlow', updated .gitignore for Next.js/Python.
- [project] Frontend: Next.js 16, Tailwind v4, no component libraries → tech-decisions.md
- [project] Backend: Python, FastAPI, librosa, Groq Whisper, Gemini 3.5 Flash-Lite → tech-decisions.md
- [project] SpeakFlow design uses CSS vars (--bg-base), DM Sans, JetBrains Mono → project-conventions.md
- [project] SpeakFlow architecture uses 2-phase responses (Phase 1 fast, Phase 2 async) → tech-decisions.md
- [session] Frontend Phases 1-11 complete, instrumented, verified via Playwright. Phases 12-15 paused pending backend completion.
- [session] Backend Phase A (Project Scaffold & Config) complete.
- [session] Backend Phase B (Groq Whisper Integration) complete. Real API keys inserted and tested successfully.
- [session] Backend Phase C (Librosa Acoustic Engine) complete. Implemented feature extraction and scoring. Verified by user with 54-point gap.
- [session] Backend Phase D (Phoneme Reference Dictionary) complete. Implemented ReferenceDictionary with manual overrides and tests.
- [session] Backend Phase E (Gemini 3.5 Flash-Lite Integration) complete. Implemented feedback and hesitation generation with SDK exceptions and timeouts.
- [session] Backend Phase F (Local Whisper Fallback) complete. Integrated faster-whisper (tiny.en) for offline STT fallback and DNS-based network reachability detection with TTL.
- [session] Backend Phase G (WebSocket Local Mesh) complete. Implemented 2-phase messaging and LAN binding.
- [session] Backend Phase H (Cloud Sync-on-Reconnect) complete. Implemented aiosqlite local persistence and background sync task.
- [reference] Phase J and K: COMPLETE. Backend fallbacks, telemetry, integration, and demo freeze complete -> ROADMAP.md
- [session] Frontend Phase 10 (API Integration & Wiring) complete. Fully wired frontend Context to FastAPI backend on port 8003. Fixed cascading rendering loops and lint issues.
- [session] Frontend Phases 11 (Settings & Network Monitor) + 12 (Offline Fallback UI) complete. Verified Playwright tests passing.
- [session] Frontend Phase 13 (Urdu Support & Bilingual Feedback) in progress. Urdu checkpoints and ReadingSessionContext language switching implemented.
- [bug-fix] Fixed backend 500 error: feature_extractor.py uses PyAV to decode WebM audio (soundfile/libsndfile cannot handle WebM). Backend must be restarted to pick up code changes.
- [bug-fix] Fixed local_whisper.py: TranscriptResult now includes 'words: List[WordTimestamp]' field. Switched to multilingual 'tiny' model (was 'tiny.en') to support Urdu transcription.
- [bug-fix] Fixed lib/api.ts fetchFeedback URL: was /feedback?checkpoint_id= (query param) should be /feedback/{checkpoint_id} (path param). This caused every feedback poll to return 404 → 0% accuracy forever.
- [bug-fix] Fixed MetricPills.tsx: hardcoded "Good Reading!" label replaced with dynamic score-based label (Excellent/Great/Good Effort/Keep Practicing/Needs More Practice).
- [bug-fix] Fixed sessions.py: when STT returns no word timestamps (Urdu fallback), synthetic words are generated from transcript text to avoid 0% accuracy.
- [project] Backend port is 8003 (not 8000). Frontend uses NEXT_PUBLIC_API_URL env var or defaults to localhost:8000 — must set env to 8003 for dev.
