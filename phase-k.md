# Phase K: Backend Integration Pass & Demo Freeze

## Goal
Validate the full backend pipeline from audio input to WebSocket Phase 2 delivery, ensure privacy compliance (no audio persistence), and finalize demo configurations.

## Tasks
- [ ] Task 1: **Verify No Audio Persistence**
  - Search the codebase for `open.*wb`, `write.*audio`, or `save.*wav`.
  - Confirm no raw audio bytes are being saved to disk anywhere.
  - **Verify**: Grep returns 0 results for audio file writing.

- [ ] Task 2: **Demo API Keys**
  - Update `.env` and `app/core/config.py` to support `GEMINI_API_KEY_DEMO`.
  - Update `gemini_client.py` to use the demo key when the environment is set to demo mode.
  - **Verify**: `config.py` loads `GEMINI_API_KEY_DEMO`.

- [ ] Task 3: **Privacy Documentation**
  - Update the backend `README.md` (or create one) to explicitly document that Phase E.2 (hesitation judgment) sends audio clips to Google's API, while everything else is local or uses Groq.
  - **Verify**: Documentation clearly states the privacy implications of the multimodal Gemini calls.

- [ ] Task 4: **End-to-End Pipeline & Calibration Test**
  - Run the full pipeline test script on sample audio for English and Urdu.
  - Check that correct words score >= 70 and mispronunciations score < 70.
  - Identify any unstable words and note them for removal from the frontend demo content.
  - **Verify**: Test script passes with expected Phase 1 JSON and Phase 2 WebSocket (or simulated Phase 2) outputs.

## Done When
- [ ] No audio persistence is confirmed.
- [ ] Demo keys are configured.
- [ ] Privacy constraints are documented.
- [ ] Full pipeline is stable and tested.
