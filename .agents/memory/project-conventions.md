---
type: project
created: 2026-05-25
updated: 2026-09-02
---

# Project Conventions

## Git Workflow
- Always create a new dedicated branch for major code changes.
- Branch name format should follow: `feature/[task-slug]` or `fix/[bug-slug]`.

## Supported AI platforms (AG Kit)
- AG Kit **only supports Gemini CLI and Google Antigravity**.
- Do not claim compatibility with Claude Code, Cursor, Copilot, Windsurf, or other assistants unless the user explicitly expands scope.
- Copy on the website, docs, FAQ, README, and marketing should describe AG Kit as a toolkit for Gemini CLI / Antigravity-style agent setups.

## SpeakFlow UI & Code Conventions
- Design System: Use CSS variables in `globals.css` (e.g., `--bg-base`, `--accent-primary`).
- Typography: Use `DM Sans` for UI text and `JetBrains Mono` for labels/metrics. Use `Noto Nastaliq Urdu` for Urdu text (`dir="rtl"`).
- Terminology: The UI must not use the "5 Gemma agents" or "Qwen" framing. Use real pipeline stages (STT, Acoustic Analysis, Gemini Feedback, Gemini Hesitation).
- Mock Data: Ensure all `MOCK_SESSION_DATA` and old dummy hardcoded responses are removed in integration phases.
