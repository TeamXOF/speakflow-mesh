# Phase 10: API Layer & Context Wiring

**Project Type**: WEB
**Phase**: 10

## Overview
Wire the frontend mock UI to the actual backend API. This involves updating `lib/api.ts` to make real HTTP requests, and `SpeakFlowContext.tsx` to handle the two-phase backend response (immediate REST, async WebSocket/polling).

## Task Breakdown

### Task 1: Complete `lib/api.ts`
- **Agent**: frontend-specialist
- **Input**: Current stubbed `lib/api.ts`
- **Output**: Fully implemented API client with `createSession`, `analyzeCheckpoint` (multipart), `fetchFeedback`.
- **Verify**: Type check passes, functions construct correct URLs.

### Task 2: Implement Context Methods (`SpeakFlowContext.tsx`)
- **Agent**: frontend-specialist
- **Input**: Empty `SpeakFlowContext`
- **Output**: Context provider with `startNewSession`, `recordAndAnalyzeCheckpoint`, and WebSocket management. Includes toast notification system.
- **Verify**: Context provides required methods to child components without rendering errors.

### Task 3: Wire Checkpoint UI
- **Agent**: frontend-specialist
- **Input**: `app/read/[chapterId]/page.tsx`
- **Output**: Mic button triggers `recordAndAnalyzeCheckpoint` instead of mock timeout.
- **Verify**: Clicking mic records audio, stops, and successfully hits the API context method.

## Phase X: Verification
- [ ] Lint: `npm run lint`
- [ ] Type Check: `npx tsc --noEmit`
- [ ] Runtime: E2E test of the recording flow.
