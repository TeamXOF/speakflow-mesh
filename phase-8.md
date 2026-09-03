# Project Plan: Phase 8 - Session Analysis (T3)

## Goal
Build the single session detail view for teachers. This page provides a deep dive into a specific reading session, showing word-level analysis, hesitation detection, and AI-generated feedback.

## Task Breakdown
1. **Scaffold Sessions Route**
   - Create `app/sessions/page.tsx` with a basic placeholder list of sessions.
   - Create `app/sessions/[id]/page.tsx` for the detail view.
2. **Extract/Reuse Components**
   - Extract the Gemini speech bubble from Phase 4 into a reusable `AIFeedbackBubble.tsx` component.
   - Extract or reuse the word chip styling from Phase 3 for the Word Analysis section.
3. **Build Session Detail View**
   - Header: Back button, Student Name, Date/Time, Accuracy Badge.
   - Sections: Overview, Word Analysis, AI Feedback.
   - Overview panel: Engagement status badge, Hesitation detection badge.
   - Word Analysis panel: Show target sentence broken down into colored chips.
   - AI Feedback panel: Render `AIFeedbackBubble.tsx`.
   - Recommended Practice: Show 1-3 flagged words.

## Verification Checklist (Phase 8)
- [ ] Navigate to `http://localhost:3000/sessions/sess_demo`.
- [ ] Student name and date are shown at the top.
- [ ] An accuracy score (85%) is prominently displayed.
- [ ] You see per-word colored chips matching the Phase 3 style.
- [ ] The AI feedback text is displayed in a speech-bubble-style card.
- [ ] "Hesitation Detected" badge shows a clear yes/no indicator.
- [ ] Recommended practice words are shown as chips.
