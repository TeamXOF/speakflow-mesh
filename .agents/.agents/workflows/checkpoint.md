# /checkpoint — Session Checkpoint

$ARGUMENTS

---

## Task

Use the `checkpoint-save` skill to save all session progress:

```
WORKFLOW:
1. Read .agents/skills/checkpoint-save/SKILL.md
2. Gather current state (git status, plan file, memory files)
3. Update .agents/memory/booksage-project.md with phase status + session notes
4. Update .agents/memory/MEMORY.md index with any new entries
5. git add -A
6. git commit -m "checkpoint: [phase/status] — [what was done]"
7. git push origin main
8. Output the confirm block exactly as specified in the skill
```

ARGUMENTS (optional — user can pass phase status):
- If $ARGUMENTS is empty: infer status from plan file and git log
- If $ARGUMENTS contains phase info: use it as authoritative
```

---

## Expected Output

```
✅ Checkpoint saved

Memory updated: ...
Git: ...
Resume instructions: ...
```
