# Phase 2: Checkpoint Screen (S2)

## Overview
Build the checkpoint reading screen where a child sees the target sentence and taps to record their voice. The screen includes real microphone recording with a live waveform visualization, but uses mock data for the analysis results.

## Project Type
WEB - UI Implementation & Web Audio

## Success Criteria
- Route `app/read/[chapterId]/page.tsx` renders the Checkpoint screen.
- Screen displays "Checkpoint X of Y", a back arrow, and the star count badge.
- A large, prominent target sentence is displayed in DM Sans (28-32px).
- A large circular microphone button handles the recording state.
- Web Audio API `AnalyserNode` is used to create a live `<WaveformVisualizer>`.
- The UI handles states: `idle`, `recording`, `processing`, and `complete`.

## Tech Stack
React, Tailwind CSS, Lucide React (for icons), Web Audio API

## File Structure
- `/app/read/[chapterId]/page.tsx` (Main checkpoint view)
- `/components/Checkpoint/`
  - `MicButton.tsx` (Interactive recording button)
  - `WaveformVisualizer.tsx` (Web Audio API visualization)
  - `ReadingPrompt.tsx` (Sentence display)
- `/hooks/useAudioRecorder.ts` (Custom hook for mic capture and analyzer logic)

## Task Breakdown

1. **Task 2.1: Page Layout & Header Elements**
   - **Agent**: `frontend-specialist`
   - **Skills**: `tailwind-patterns`
   - **Priority**: P0
   - **INPUT**: Phase 2 UI requirements (Back arrow, checkpoint counter, StarBadge).
   - **OUTPUT**: The structural layout of `app/read/[chapterId]/page.tsx` matching the kid-facing fullscreen experience.

2. **Task 2.2: Mock Data & Reading Prompt**
   - **Agent**: `frontend-specialist`
   - **Priority**: P0
   - **INPUT**: `DEMO_CHECKPOINTS` mock data.
   - **OUTPUT**: `ReadingPrompt` component rendering the target sentence beautifully in large text.

3. **Task 2.3: Audio Recorder Hook & Waveform Component**
   - **Agent**: `frontend-specialist`
   - **Skills**: `react-expert`
   - **Priority**: P0
   - **INPUT**: Requirement for live Web Audio API `AnalyserNode` visualization.
   - **OUTPUT**: `useAudioRecorder` hook that requests mic permission and sets up the analyzer. `<WaveformVisualizer>` component that draws the live audio frequencies.

4. **Task 2.4: Mic Button & State Machine**
   - **Agent**: `frontend-specialist`
   - **Priority**: P0
   - **INPUT**: Four interaction states: idle, recording, processing, complete.
   - **OUTPUT**: The main `MicButton` component that toggles recording, shows pulsing animations while recording, displays a spinner when processing, and triggers completion.

5. **Task 2.5: Route Transition (Complete State)**
   - **Agent**: `frontend-specialist`
   - **Priority**: P1
   - **INPUT**: "Complete" state transitions to feedback screen (Phase 3).
   - **OUTPUT**: Logic to show a placeholder for the Phase 3 feedback once recording finishes (or navigates to a `?step=feedback` query param).

## Phase X: Verification
- [ ] Navigate to `http://localhost:3000/read/ch2`.
- [ ] You see "Checkpoint 2 of 5" at the top.
- [ ] The target sentence is displayed in large, readable text (28-32px).
- [ ] There is a large, obvious mic button at the bottom.
- [ ] Tap the mic button → the browser asks for microphone permission.
- [ ] While "recording": the mic button changes appearance (pulse/color change), and you see a live waveform animation reacting to your voice.
- [ ] Tap again (or wait for timeout) → you see a brief "processing" state.
- [ ] After processing, the screen transitions to show a feedback placeholder (Phase 3).
- [ ] The back arrow navigates you back to the story map.
- [ ] No sidebar/topbar visible.
