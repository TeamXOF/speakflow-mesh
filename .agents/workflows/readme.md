# /readme - Interactive Top-Star GitHub README Craftsman

> Generate, upgrade, and polish a world-class GitHub README for the current project.

---

## Purpose

The `/readme` command triggers the **`readme-craftsman`** skill. It analyzes the codebase and project memories, performs an itemized `.gitignore` security audit, conducts an interactive Socratic onboarding interview ("Grill Me"-style questioning), generates brand assets (Logo + Social Share Card), guides screenshot placement, and produces a top-star tier GitHub `README.md`.

---

## Behavior

When `/readme` is called:

1. **Phase 1: Silent Discovery**
   - Scans `.agents/memory/` and project manifests (`package.json`, `Cargo.toml`, `pyproject.toml`, etc.).
   - Extracts tech stack, architecture, and core user-facing features.
2. **Phase 2: .gitignore Security Audit**
   - Presents an itemized checklist of detected unignored secrets (`.env`), build outputs, and caches.
   - Hardens `.gitignore` based on user approval.
3. **Phase 3: Socratic Onboarding Interview**
   - Solicits logo preferences & calls `generate_image` for `assets/logo.png` and `assets/social-card.png`.
   - Outlines 3–5 specific screenshot views to capture and verifies `assets/screenshots/`.
   - Explains standard Shields.io badges and licenses (MIT, Apache, GPL) and asks permission to add them.
4. **Phase 4: Generation & GitHub Sync**
   - Formats a comprehensive `README.md` modeled after top-star open-source repositories.
   - Offers to stage, commit, and push changes to GitHub remote.

---

## How to Share with Friends

To use this skill in any other repository:
1. Copy the `.agents/skills/readme-craftsman/` directory into that project's `.agents/skills/` folder.
2. Type `/readme` in chat.
