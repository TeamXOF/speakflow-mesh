# Project Plan: Phase 6 - Teacher Dashboard (T1)

## Goal
Build the main teacher admin overview dashboard.

## Task Breakdown
1. **Create Dashboard Components**
   - Create `components/Dashboard/StatCard.tsx` for the 4 top metrics.
   - Create `components/Dashboard/PerformanceChart.tsx` using `recharts` (LineChart).
   - Create `components/Dashboard/StrugglingAreasChart.tsx` using `recharts` (BarChart).
2. **Assemble Dashboard Page**
   - Update `app/dashboard/page.tsx` to include the grid layout.
   - Hardcode mock data for the charts and stat cards.
3. **Styling Polish**
   - Ensure components use `.speakflow-card` style.
   - Ensure JetBrains Mono is used for data numbers.

## Verification Checklist (Phase 6)
- [ ] Navigate to `http://localhost:3000/dashboard`.
- [ ] Sidebar and topbar are visible.
- [ ] 4 stat cards in a row: Active Students, Daily Sessions, Accuracy, Improvement.
- [ ] Line chart labeled "Class Performance (Last 7 Days)".
- [ ] Horizontal bar chart labeled "Top Struggling Areas".
- [ ] All cards use `.speakflow-card` styling.
- [ ] Numbers use JetBrains Mono.
