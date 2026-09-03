# Project Plan: Phase 6.5 & 7 - Students List and Progress (T0 & T2)

## Goal
Build the Teacher Dashboard's student roster page (Phase 6.5) and the individual student progress drill-down view (Phase 7).

## Task Breakdown

### 1. Phase 6.5 (Students List)
- Update `app/students/page.tsx`.
- Create a list/table layout using `.speakflow-card` styling for rows.
- Add a search input and "Add Student" button.
- Hardcode the `DEMO_STUDENTS` array.
- Make each row a `Link` to `/students/[id]`.

### 2. Phase 7 (Student Progress Drill-Down)
- Create `app/students/[id]/page.tsx`.
- Add a "Back to Students" navigation link.
- Build the student header (Name, Level, Age).
- Render 4 `<StatCard>` components (reused from Phase 6) with individual student metrics.
- Refactor `<PerformanceChart>` to accept a `title` prop, or create `<StudentPerformanceChart>`.
- Create a `StrugglingWords` section with pill chips for flagged words.

## Verification Checklist (Phase 6.5 & 7)
- [ ] Navigate to `/students`.
- [ ] You see a list/table of students with names, levels, and last active info.
- [ ] A search input is visible at the top.
- [ ] Clicking a student row navigates to `/students/[id]`.
- [ ] On `/students/[id]`, student name, level, and age are shown at the top.
- [ ] "← Back to Students" link is visible and works.
- [ ] 4 metric cards show Checkpoints, Accuracy, WPM, and Improvement.
- [ ] A line chart shows accuracy trend over time.
- [ ] A "Struggling Words" section shows pill chips with word names.
- [ ] Numbers use JetBrains Mono font.
