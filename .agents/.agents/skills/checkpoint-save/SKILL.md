---
name: checkpoint-save
description: >
  One-command session checkpoint for BookSage. Updates all memory files with
  the current phase status, stages and commits all changes to Git, and pushes
  to GitHub — so any future session can resume with zero re-explanation.
when_to_use: >
  When the user says /checkpoint, "save progress", "save everything", 
  "checkpoint", "we're done for today", or whenever the context window is 
  getting full and work needs to be preserved before starting a new chat.
skills:
  - memory-system
version: 1.0.0
effort: low
---

# Checkpoint Save Skill

> One command saves everything: memory, git commit, git push.

## Purpose

Eliminates the manual "remember this, remember that" workflow. A single `/checkpoint` call does the complete session handoff automatically.

## What This Skill Does (in order)

1. **Reads current state** — scans git status, booksage-plan.md, and memory files
2. **Updates memory files** — writes current phase status and any new decisions to booksage-project.md
3. **Updates MEMORY.md index** — syncs the index with any new entries
4. **Commits all changes** — stages everything and commits with a structured message
5. **Pushes to GitHub** — ensures the streak is counted and the repo is current
6. **Confirms** — reports exactly what was saved and what commit was made

---

## Trigger

User says any of:
- `/checkpoint`
- `/checkpoint Phase 2 is done`
- `save progress`
- `save everything and commit`
- `we're done for today`
- `context is getting full, save everything`

---

## Execution Protocol

### Step 1 — Gather Current State (silent, no output yet)

Run these reads:
1. `git status` — what files are modified/untracked
2. `git log --oneline -5` — what the last 5 commits were
3. Read `booksage-plan.md` — identify which phases are checked off
4. Read `.agents/memory/booksage-project.md` — check last known state

### Step 2 — Determine What Changed This Session

Compare the plan checkboxes against what memory already knew. The delta is what to save.

If the user gave explicit phase/status info in their trigger (e.g. `/checkpoint Phase 2 done`), use that as authoritative. Otherwise infer from the plan file.

### Step 3 — Update booksage-project.md

In the "Development Phase Status" table, update any phases that completed this session from `⏳ Not started` to `✅ Done` or `🔨 In progress`.

Also append a "Session Notes" block at the bottom of booksage-project.md with:
```markdown
### Session [date] Notes
- [bullet: what was built or decided this session]
- [bullet: any important decisions made]
- [bullet: what is next]
```

### Step 4 — Update MEMORY.md Index

Add any new one-line entries to MEMORY.md that reflect facts learned this session.
Do NOT re-add entries that already exist. Keep index under 200 lines.

### Step 5 — Git Commit

```powershell
git add -A
git commit -m "checkpoint: [phase name/status] — [2-3 word summary of what was done]"
```

Commit message format: `checkpoint: phase/N complete — [what was built]`
Examples:
- `checkpoint: phase/0 complete — Tauri scaffold + Zustand stores`
- `checkpoint: phase/2 in progress — Gemini + OpenAI clients done`
- `checkpoint: session end — memory updated, docs improved`

### Step 6 — Git Push

```powershell
git push origin main
```

### Step 7 — Confirm to User

Output exactly this block:

```
✅ Checkpoint saved

Memory updated:
  - booksage-project.md: [what was updated]
  - MEMORY.md: [N new entries added / no changes]

Git:
  - Commit: [commit hash] "[commit message]"
  - Pushed to: github.com/Waleed-Khalid-dev/BookSage

Resume instructions:
  Open a new chat and say: "Continue BookSage — [current phase]"
  The AI will read MEMORY.md and know exactly where we are.
```

---

## Rules

1. **Never delete memory entries** — only append or update
2. **Never skip the push** — a local commit without a push is useless for streaks
3. **Always verify push succeeded** — check exit code before confirming
4. **If git push fails** — report the error clearly and suggest `git push --force-with-lease` if needed
5. **Be concise** — the checkpoint output should fit in ~15 lines, no verbose summaries

---

## Example Full Run

User: `/checkpoint Phase 1 is done — pdf_handler and chapter_splitter both pass their verify steps`

AI actions (silent):
1. Reads git status → 3 modified files
2. Reads plan → Phase 1 is unchecked in plan
3. Updates booksage-project.md → Phase 1 row: ⏳ → ✅
4. Adds session note to booksage-project.md
5. Adds to MEMORY.md: `- [reference] Phase 1 PDF Engine: COMPLETE. pdf_handler.py + chapter_splitter.py verified → booksage-project.md`
6. `git add -A && git commit -m "checkpoint: phase/1 complete — pdf_handler + chapter_splitter verified"`
7. `git push origin main`
8. Outputs confirm block

---

## Edge Cases

| Situation | What to do |
|-----------|-----------|
| Nothing changed since last commit | Still update memory if user gave new info; skip git commit if `git status` is clean |
| User gives no phase info | Ask: "Which phase are we on and what was completed?" before saving |
| Push fails (auth error) | Report error; remind user to check GitHub credentials |
| MEMORY.md near 200 lines | Warn: "Memory index is at X lines. Consider /remember prune soon." |
| booksage-project.md missing | Re-create from MEMORY.md entries |
