# Phase 1: Story Map / Chapter Select (S1)

## Overview
Build the kid-facing adventure map where children select a chapter to read. This is a full-screen experience with no sidebar or topbar, utilizing static mock data.

## Project Type
WEB - UI Implementation

## Success Criteria
- Route `app/read/page.tsx` renders a visual adventure map (nature scene).
- The map displays a winding path with numbered chapter stops (Completed, In Progress, Locked).
- Header shows "Your Journey" with a subtitle.
- Top-right displays a star count badge.
- Bottom legend explains the chapter states.
- Clicking an unlocked chapter navigates to `/read/[chapterId]`.

## Tech Stack
React, Tailwind CSS, Lucide React (for icons)

## File Structure
- `/app/read/page.tsx` (Main adventure map view)
- `/components/ChapterMap/`
  - `MapNode.tsx` (Individual chapter stop component)
  - `StarBadge.tsx` (Top right badge)
- `/app/read/[chapterId]/page.tsx` (Minimal placeholder for navigation target)

## Task Breakdown

1. **Task 1.1: Component Setup & Layout Structure**
   - **Agent**: `frontend-specialist`
   - **Skills**: `frontend-architecture`, `tailwind-patterns`
   - **Priority**: P0
   - **INPUT**: `ROADMAP.md` Phase 1 requirements
   - **OUTPUT**: `app/read/page.tsx` layout with header, star badge, and legend.
   - **VERIFY**: The screen renders without the teacher sidebar/topbar (which is already configured in `AppShell`).

2. **Task 1.2: Adventure Map UI & Winding Path**
   - **Agent**: `frontend-specialist`
   - **Skills**: `frontend-design`, `tailwind-patterns`
   - **Priority**: P0
   - **INPUT**: Design rules from Phase 1 (greens, browns, blues for nature, winding path).
   - **OUTPUT**: A visually appealing background scene constructed with CSS/SVG, featuring a path.
   - **VERIFY**: The UI looks playful, age-appropriate, and resembles a nature map.

3. **Task 1.3: Chapter Nodes & Mock Data Integration**
   - **Agent**: `frontend-specialist`
   - **Priority**: P0
   - **INPUT**: `DEMO_CHAPTERS` mock data from `ROADMAP.md`.
   - **OUTPUT**: `MapNode` components rendered along the path. Completed states have checkmarks, in-progress pulse/highlight, locked have lock icons.
   - **VERIFY**: All 3 states render distinctively with minimum 64x64px tap targets.

4. **Task 1.4: Navigation & Route Stubs**
   - **Agent**: `frontend-specialist`
   - **Priority**: P1
   - **INPUT**: Requirement to navigate to `/read/[chapterId]`.
   - **OUTPUT**: A minimal placeholder `app/read/[chapterId]/page.tsx` so navigation doesn't 404, and `<Link>` wrappers around unlocked nodes.
   - **VERIFY**: Clicking an unlocked node navigates. Clicking a locked node does nothing.

## Phase X: Verification
- [ ] Navigate to `http://localhost:3000/read`.
- [ ] There is NO sidebar or topbar on this screen.
- [ ] You see an illustrated adventure map — not a plain list or table.
- [ ] There are numbered chapter stops on a winding path.
- [ ] Chapter 1 shows a completed state (checkmark, filled).
- [ ] Chapter 2 shows an in-progress state (highlighted/glowing).
- [ ] Chapter 3 shows a locked state (grayed, lock icon).
- [ ] The star count badge is visible in the top-right area.
- [ ] Clicking Chapter 2 (in-progress) navigates you to the checkpoint screen.
- [ ] Clicking Chapter 3 (locked) does nothing — no navigation.
- [ ] The screen looks age-appropriate for a 6-8 year old — large, colorful, playful.
