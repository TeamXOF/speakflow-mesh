# SpeakFlow — Git & GitHub Guide for Agent "Z Code"

> **Notice for Z Code**: This document provides all repository details, git credentials, branching rules, directory handling, and commit conventions needed to push code cleanly to GitHub under **Waleed Khalid**'s name.

---

## 1. Quick Identity & Repository Details

| Setting | Value |
| :--- | :--- |
| **Git Author Name** | `Waleed Khalid` |
| **Git Author Email** | `apex.remake@gmail.com` |
| **Remote Name** | `origin` |
| **Remote URL** | `https://github.com/TeamXOF/speakflow-mesh.git` |
| **GitHub Organization** | `TeamXOF` |
| **Repository Name** | `speakflow-mesh` |
| **Active Working Branch** | `Waleed-Khalid` |
| **Upstream Tracking Branch** | `origin/Waleed-Khalid` |
| **Local Project Path** | `D:\[Project]\SpeakFlow V2` |

---

## 2. ⚠️ Critical Windows & PowerShell Gotcha: LiteralPath

The project lives in `D:\[Project]\SpeakFlow V2`. 

**The square brackets `[Project]` in the path are interpreted by PowerShell as wildcard/regex pattern characters.**

If you execute a raw subshell or try to navigate with plain `cd`, PowerShell will silently fail to resolve the path and drop into `C:\Windows\System32\WindowsPowerShell\v1.0`. Any subsequent `git status` or `git commit` command will report:
```text
fatal: not a git repository (or any of the parent directories): .git
```

### The Fix (MANDATORY for Z Code):
Always navigate or run git using `-LiteralPath` or `-C`:

```powershell
# Option A: Navigate using -LiteralPath first
Set-Location -LiteralPath 'D:\[Project]\SpeakFlow V2'
git status

# Option B: Pass explicit directory to git via -C flag
git -C "D:\[Project]\SpeakFlow V2" status
```

---

## 3. Git Identity & Safe Directory Setup

Run these commands once in PowerShell or Bash to configure the environment:

```powershell
# 1. Set author identity
git config user.name "Waleed Khalid"
git config user.email "apex.remake@gmail.com"

# 2. Add safe directory exception for Windows bracket paths
git config --global --add safe.directory "D:/[Project]/SpeakFlow V2"
git config --global --add safe.directory "D:\[Project]\SpeakFlow V2"

# 3. Configure Git Credential Manager (GCM)
git config --global credential.helper manager
```

*(You can also simply run `github/setup_git.bat` or `github/setup_git.ps1` in this folder).*

---

## 4. Branch Strategy & Rules

1. **Active Work Branch (`Waleed-Khalid`)**:
   - All your changes, feature integrations, and updates must be pushed to branch `Waleed-Khalid`.
   - Never push directly to `origin/main` without explicit team consensus.
2. **Team Remote Branches for Context**:
   - `origin/main` — Production-ready baseline.
   - `origin/Waleed-Khalid` — Waleed's work & integration branch.
   - `origin/backend` — Backend team stream.
   - `origin/frontend` — Frontend team stream.
   - `origin/nafees` — Teammate branch.
3. **If creating feature sub-branches**:
   - Use naming format: `feature/<task-name>` or `fix/<bug-name>` (e.g. `feature/story-mode-integration`).

---

## 5. Commit Standards: Meaningful Commit Descriptions

All commits should follow the **Conventional Commits** specification. Commits should be descriptive, explaining **what** was done and **why**.

### Commit Structure:
```text
<type>(<scope>): <concise imperative summary (under 72 chars)>

- <Bullet 1: Detail of specific architectural or component change>
- <Bullet 2: Files or endpoints modified>
- <Bullet 3: Verification outcome or bug prevented>
```

### Common Types:
- `feat`: New feature or user-facing capability (e.g. Story Mode, Teacher Dashboard).
- `fix`: Bug fix (e.g. alignment mismatch, audio 500 error, URL route).
- `refactor`: Restructuring existing code without changing external behavior.
- `perf`: Performance optimization (e.g. caching, latency reduction).
- `docs`: Documentation updates (e.g. README, API docs).
- `chore`: Dependency updates, tooling, `.gitignore` tweaks.

### Good Examples for Your Tasks:

#### Example 1: Story Mode Integration
```text
feat(story-mode): integrate letter-by-letter pronunciation and alignment engine

- Import story-mode frontend components (WordAnalysis, PracticeSection, ScoreRing)
- Connect FastAPI rest_sessions.py to SequenceMatcher alignment logic
- Differentiate between mispronunciations, omitted words, and low volume
- Integrate PyAV WebM audio decoder to prevent server 500 errors
```

#### Example 2: Teacher Dashboard Update
```text
feat(teacher-dash): add real-time student pronunciation analytics table

- Add class accuracy overview metrics and problem-word drill-downs
- Connect student session logs to SQLite/database sync endpoints
- Add date range filtering and performance export capabilities
```

#### Example 3: Bug Fix
```text
fix(api): correct feedback endpoint route from query param to path param

- Update lib/api.ts fetchFeedback to call /feedback/{checkpoint_id}
- Resolves 404 response on polling and restores dynamic accuracy calculation
```

---

## 6. Step-by-Step Push Routine for Z Code

Follow this exact sequence whenever making commits:

```powershell
# -------------------------------------------------------------
# STEP 1: Navigate to repository using -LiteralPath
# -------------------------------------------------------------
Set-Location -LiteralPath 'D:\[Project]\SpeakFlow V2'

# -------------------------------------------------------------
# STEP 2: Check current status & ensure no junk/secrets are staged
# -------------------------------------------------------------
git status

# -------------------------------------------------------------
# STEP 3: Stage ONLY your intended files (avoid `git add .` if unsure)
# -------------------------------------------------------------
git add story-mode/
git add frontend/
git add backend/

# -------------------------------------------------------------
# STEP 4: Verify staged files
# -------------------------------------------------------------
git diff --staged --stat

# -------------------------------------------------------------
# STEP 5: Commit with meaningful message
# -------------------------------------------------------------
git commit -m "feat(story-mode): integrate word-by-word pronunciation system into student pipeline"

# -------------------------------------------------------------
# STEP 6: Pull rebase to stay synchronized with remote
# -------------------------------------------------------------
git pull --rebase origin Waleed-Khalid

# -------------------------------------------------------------
# STEP 7: Push to GitHub under Waleed's account
# -------------------------------------------------------------
git push origin Waleed-Khalid
```

---

## 7. Authentication Setup

### Primary Method: Windows Git Credential Manager (Active)
Git on this machine is already configured with `credential.helper = manager`. 
- GitHub authentication token is securely cached in Windows Credential Manager under Waleed's credentials.
- When running `git push origin Waleed-Khalid`, authentication happens automatically.

### Fallback Method: Personal Access Token (PAT)
If running in a non-interactive shell where Credential Manager cannot prompt or authenticate:
```powershell
# Set remote URL to include a Personal Access Token (PAT)
git remote set-url origin https://<YOUR_GITHUB_TOKEN>@github.com/TeamXOF/speakflow-mesh.git
git push origin Waleed-Khalid
```

### SSH Method:
If SSH keys are preferred:
```powershell
git remote set-url origin git@github.com:TeamXOF/speakflow-mesh.git
```

---

## 8. Safety Checklist: What NEVER to Commit

Before every commit, verify you are not committing:
- ❌ `.env`, `.env.local` (Never commit Groq, Gemini, or database keys)
- ❌ Temporary audio recordings (`*.webm`, `*.m4a`, `backend/temp_*`)
- ❌ SQLite databases (`*.db`, `*.sqlite3`, `backend/data/speakflow.db`)
- ❌ `node_modules/`, `.next/`, `__pycache__/`
- ❌ Playwright test dumps (`.playwright-mcp/`)

Ensure the master `.gitignore` located at [github/.gitignore](file:///d:/%5BProject%5D/SpeakFlow%20V2/github/.gitignore) or the root `.gitignore` is active.

---

## 9. Troubleshooting & Quick Fixes

- **Detached HEAD**:
  ```powershell
  git checkout Waleed-Khalid
  ```
- **Discard unstaged changes in a file**:
  ```powershell
  git restore <filepath>
  ```
- **Unstage a file that was accidentally added**:
  ```powershell
  git restore --staged <filepath>
  ```
- **Remove a tracked file from git without deleting it from disk**:
  ```powershell
  git rm --cached <filepath>
  ```
- **Check who is configured as the committer**:
  ```powershell
  git config user.name
  git config user.email
  ```
