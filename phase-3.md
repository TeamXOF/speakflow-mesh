# Phase 3: Recording Feedback (S3)

## Overview
Build the immediate per-word feedback screen shown right after the child completes their recording. This screen parses the Phase 1 STT analysis (currently mocked) and visualizes the results with a mascot, score ring, metric pills, and word-by-word colored chips.

## Project Type
WEB - UI Implementation

## Success Criteria
- Route `app/read/[chapterId]/page.tsx?step=feedback` renders the feedback screen instead of the recording view.
- A mascot character (purple star/cloud) is displayed with a supportive message.
- A large, prominent score ring/circle (e.g., 85%) is displayed.
- Three metric pills show Accuracy, Fluency (WPM), and Pauses.
- "Word by Word" section renders chips colored correctly based on the mock data (Green = correct, Red = missed/mismatch, Amber = needs practice).
- A "Next Checkpoint →" button is present but **disabled**.
- No sidebar or topbar (fullscreen kid view).

## Tech Stack
React, Tailwind CSS, Lucide React (for icons)

## File Structure
- `/app/read/[chapterId]/page.tsx` (Modified to render Phase 3 UI when `step=feedback`)
- `/components/Feedback/`
  - `MascotMessage.tsx` (Character and text bubble)
  - `ScoreRing.tsx` (Circular progress/score display)
  - `MetricPills.tsx` (Accuracy, Fluency, Pauses)
  - `WordChip.tsx` (Individual word state logic)
  - `WordAnalysis.tsx` (Grid of WordChips)

## Task Breakdown

1. **Task 3.1: Feedback View Container**
   - **Agent**: `frontend-specialist`
   - **Skills**: `tailwind-patterns`
   - **Priority**: P0
   - **INPUT**: `page.tsx` conditional rendering for `step=feedback`.
   - **OUTPUT**: Replace the placeholder with the main structural grid for Phase 3 feedback.

2. **Task 3.2: Mascot & Score Ring**
   - **Agent**: `frontend-specialist`
   - **Priority**: P0
   - **INPUT**: Requirement for a cute purple star/cloud and a large score display.
   - **OUTPUT**: `MascotMessage` and `ScoreRing` components utilizing CSS shapes/SVG for the character and ring.

3. **Task 3.3: Metrics Component**
   - **Agent**: `frontend-specialist`
   - **Priority**: P1
   - **INPUT**: `mockPhase1` data (WPM, hesitations, etc.).
   - **OUTPUT**: `MetricPills` component rendering the top-level stats.

4. **Task 3.4: Word by Word Analysis**
   - **Agent**: `frontend-specialist`
   - **Priority**: P0
   - **INPUT**: The color mapping logic for `correct` and `phoneme_mismatch`.
   - **OUTPUT**: `WordAnalysis` and `WordChip` components mapping over the `words` array to render green, amber, and red chips.

5. **Task 3.5: Navigation Controls**
   - **Agent**: `frontend-specialist`
   - **Priority**: P1
   - **INPUT**: "Next Checkpoint" button requirement (initially disabled).
   - **OUTPUT**: Bottom control bar with the disabled "Next Checkpoint" button.

## Phase X: Verification
- [ ] Complete a recording on the checkpoint screen — it transitions to feedback view.
- [ ] You see the mascot character and a "Great job!" message.
- [ ] The score (85%) is displayed large and prominent.
- [ ] Three metric pills (Accuracy, Fluency, Pauses) are visible in a row.
- [ ] The "Word by Word" section shows colored chips for each word:
    - "the" = green, "little" = green, "explorer" = red, "climbed" = green, "the" = amber.
- [ ] You do NOT see technical labels (just colors).
- [ ] The "Next Checkpoint" button exists but is disabled/grayed out.
- [ ] No sidebar/topbar.
