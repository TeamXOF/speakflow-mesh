---
type: project
created: 2026-07-18
updated: 2026-09-02
---

# Technical Decisions

- Component metadata uses SemVer while the toolkit release keeps CalVer.
- `manifest.json` and `manifest.lock.json` must remain synchronized with component frontmatter.
- SpeakFlow Frontend: Next.js 16 (App Router), React 19, TypeScript, Tailwind v4. No component library (e.g., shadcn, MUI).
- SpeakFlow Backend: Python, FastAPI, SQLite (local persistence).
- SpeakFlow STT: Groq Whisper API (online), local quantized Whisper like faster-whisper/whisper.cpp (offline).
- SpeakFlow Acoustic Engine: librosa (pitch, formants, ZCR, spectral energy) run locally.
- SpeakFlow LLM Reasoning: Gemini 3.5 Flash-Lite (Google AI Studio) for feedback text and hesitation judgment (multimodal). Replaced Qwen.
- SpeakFlow Networking: Two-phase response (Phase 1 immediate via REST, Phase 2 async via WebSocket).
- SpeakFlow Sync: Offline sessions stored in SQLite with `synced: false`, synced to cloud on network reconnect.
