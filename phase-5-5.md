# Project Plan: Phase 5.5 - Student Flow Integration

## Goal
Wire all student screens into one seamless flow with shared state. (S1→S2→S3→S4→S5)

## Task Breakdown
1. **Create State Machine (Context)**
   - Create `contexts/ReadingSessionContext.tsx`.
   - Implement `ReadingSessionState` with `chapterStatuses`, `currentCheckpointIndex`, `flowState`, and `totalStars`.
   - Add state transitions: `startChapter`, `finishRecording`, `showPhase2`, `showRewards`, `continueAdventure`.
2. **Provider Integration**
   - Wrap application routes with `<ReadingSessionProvider>`.
3. **Refactor Story Map (`app/read/page.tsx`)**
   - Read chapter statuses dynamically from Context.
   - Update `StarBadge` to use `totalStars` from Context.
4. **Refactor Checkpoint Page (`app/read/[chapterId]/page.tsx`)**
   - Replace `useSearchParams('step')` with `flowState` from Context.
   - Update buttons to dispatch Context actions instead of `router.push`.
   - Render the correct target sentence based on `currentCheckpointIndex`.
5. **Flow Verification**
   - Test end-to-end flow from Map to Chapter Complete.

## Verification Checklist (Phase 5.5)
- [ ] Go to `http://localhost:3000/read`. See the story map.
- [ ] Click Chapter 2. See Checkpoint target sentence.
- [ ] Record, stop, see Phase 1 feedback.
- [ ] See Phase 2 feedback animate in.
- [ ] Click Next Checkpoint, see Rewards (+10 Stars).
- [ ] Click Continue Adventure, see NEXT target sentence (not map).
- [ ] Complete all 5 checkpoints and see Chapter 2 mark as "Completed" on map.
- [ ] Star count increases.
- [ ] No broken screens or infinite spinners.
