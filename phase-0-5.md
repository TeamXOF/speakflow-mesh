# Phase 0.5: Project Initialization (From Scratch)

## Overview
Bootstrap the Next.js project, install dependencies, set up the design system, and create the app shell (sidebar, topbar, and placeholder routes).

## Project Type
WEB

## Success Criteria
- Next.js (App Router) is installed and configured with TypeScript and Tailwind CSS.
- Required dependencies (`recharts`, `lucide-react`, `date-fns`) are installed.
- Global design tokens (colors, fonts, base classes) are applied.
- Global layout shell provides navigation to all sections of the application.

## Tech Stack
Frontend: Next.js (App Router), React, TypeScript, Tailwind CSS

## File Structure
- `/app` (Root application directory)
  - `/dashboard`
  - `/read`
  - `/students`
  - `/sessions`
  - `/progress`
  - `/reports`
  - `/settings`
  - `/pipeline`
- `/lib/api.ts`
- `/context/SpeakFlowContext.tsx`

## Task Breakdown

1. **Task 1: Initialize Next.js & Install Dependencies**
   - **Agent**: `frontend-specialist`
   - **Skills**: `app-builder`
   - **Priority**: P0
   - **Dependencies**: None
   - **INPUT**: `npx create-next-app` command from ROADMAP and `npm install recharts lucide-react date-fns`
   - **OUTPUT**: Generated project structure without `/src` directory.
   - **VERIFY**: Project is created and starts successfully.

2. **Task 2: Design Tokens & Fonts**
   - **Agent**: `frontend-specialist`
   - **Skills**: `tailwind-patterns`
   - **Priority**: P0
   - **Dependencies**: Task 1
   - **INPUT**: `DESIGN.md` (colors, typography)
   - **OUTPUT**: `app/globals.css` with CSS custom properties and `.speakflow-card` utility. Next/Font config for `DM Sans` and `JetBrains Mono`.
   - **VERIFY**: Background renders as cream (`#FAF7F2`) and DM Sans is active on page text.

3. **Task 3: Layout Shell Creation**
   - **Agent**: `frontend-specialist`
   - **Skills**: `frontend-architecture`
   - **Priority**: P0
   - **Dependencies**: Task 2
   - **INPUT**: Requirements for fixed sidebar (~240px) and topbar.
   - **OUTPUT**: Modified `app/layout.tsx` to include layout shell for all pages.
   - **VERIFY**: Sidebar and topbar are visually present on `localhost:3000`.

4. **Task 4: Placeholder Routes**
   - **Agent**: `frontend-specialist`
   - **Skills**: `app-builder`
   - **Priority**: P1
   - **Dependencies**: Task 3
   - **INPUT**: List of routes (`/dashboard`, `/read`, etc.)
   - **OUTPUT**: Minimal `page.tsx` for each required route folder.
   - **VERIFY**: Clicking sidebar links navigates correctly without 404s.

5. **Task 5: Core Services Stubs**
   - **Agent**: `frontend-specialist`
   - **Skills**: `clean-code`
   - **Priority**: P1
   - **Dependencies**: Task 1
   - **INPUT**: Requirements for `SpeakFlowContext` and `lib/api.ts`
   - **OUTPUT**: Initialized context provider wrapper and API types/stubs.
   - **VERIFY**: TypeScript compiles without errors.

## Phase X: Verification
- [ ] Run `npm run dev` in terminal.
- [ ] The app loads without errors in the browser console.
- [ ] You see the sidebar on the left with all navigation links.
- [ ] You see the topbar at the top with a greeting and date.
- [ ] The background is cream (`#FAF7F2`).
- [ ] Click each sidebar link — each route loads and shows its placeholder name.
- [ ] Computed styles confirm CSS variables (`--bg-base`) and `DM Sans` font are applied.
- [ ] Run `npx tsc --noEmit` — no TypeScript errors.
