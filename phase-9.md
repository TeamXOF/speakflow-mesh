# Phase 9: Checkpoint Overview (T4)

## Goal
Build the class-wide checkpoint progress table for the Teacher Dashboard.

## Route
`app/progress/page.tsx`

## Requirements
- **Top-right filter**: "All Students" dropdown (UI only, no functionality required for mock data).
- **Table**: 
  - Columns: **#**, **Checkpoint** (name), **Avg. Accuracy**, **Completed**
  - Rows should represent the 5 chapters from "The Forest Adventure" story.
  - Each row must include a small progress bar showing the completion ratio (e.g., 25/28 completed).
- **Mock Data**:
  1. The Brave Little Rabbit — 98% — 25/28
  2. Climbing the Mountain — 72% — 23/28
  3. Lost in the Forest — 68% — 18/28
  4. The Hidden Treasure — 60% — 15/28
  5. The Big Celebration — 0% — 0/28

## Verification Checklist
- [ ] Navigate to `http://localhost:3000/progress`.
- [ ] Table shows 5 checkpoint rows with names, accuracy %, and completion counts.
- [ ] Each row has a visible progress bar.
- [ ] The last row shows 0% and 0/28.
- [ ] An "All Students" dropdown filter is visible.
