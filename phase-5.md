# Project Plan: Phase 5 - Progress & Rewards Screen

## Goal
Build the checkpoint completion celebration screen.

## Task Breakdown
1. **Routing & State Integration**
   - Update `app/read/[chapterId]/page.tsx` to handle `?step=rewards`.
   - Change Phase 4's "Next Checkpoint" button to route to `?step=rewards`.
2. **Rewards Component Creation**
   - Create `components/Rewards/RewardsScreen.tsx`.
   - Implement Mascot headline ("Awesome!").
   - Implement Checkpoint subtitle ("You completed Checkpoint 2").
   - Implement Progress dots ("Your Progress — 2 / 5").
   - Implement Rewards cards ("+10 Stars", "+1 Badge") with bouncing animations.
   - Implement "Continue Adventure" button routing back to `/read`.
3. **Animations & Polish**
   - Add confetti or bouncy entrance animations using Tailwind.

## Verification Checklist (Phase 5)
- [ ] You see "Awesome!" or equivalent celebration text.
- [ ] The checkpoint number is correct (e.g. "You completed Checkpoint 2").
- [ ] Progress shows "2 / 5" with a visual bar or dots.
- [ ] Rewards (stars, badge) are displayed with icons.
- [ ] Clicking "Continue Adventure" takes you back to the story map.
- [ ] The screen feels celebratory and encouraging.
