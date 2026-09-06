# Readme Craftsman — Exported Skill for VS Code

> This folder contains the complete, self-contained **`readme-craftsman`** skill exported from SpeakFlow V2. Use this package inside **VS Code** with any AI assistant (GitHub Copilot, Cursor, Cline, Roo Code, Claude Code, Continue, or ChatGPT) to generate a top-star tier GitHub `README.md` and project brand assets.

---

## 📁 Package Contents

```text
readme-craftsman/
├── README.md                      <- You are here: Quick-start & VS Code usage guide
├── SKILL.md                       <- The core 4-phase craftsman skill specification
├── PROMPT_FOR_AI.md               <- Single-file master prompt (ready to paste into any AI chat)
├── LOGO_PROMPTS.md                <- AI image generation prompts for app icons & social cards
├── references/
│   ├── badges-catalog.md          <- Shields.io badges, licenses & tech stack badges
│   ├── layout-templates.md        <- Modular README blueprints for Web Apps, CLIs & SDKs
│   └── gitignore-templates.md     <- Ecosystem-specific .gitignore security hardening
└── vscode-integration/
    ├── .cursorrules               <- Drop-in rules for Cursor & Windsurf
    ├── copilot-instructions.md    <- Drop-in rules for GitHub Copilot (.github/)
    └── cline-roomode.json         <- Custom agent mode for Cline & Roo Code
```

---

## 🚀 How to Use This Skill in VS Code

### Method 1: The One-Click Prompt (Easiest — Works with ANY AI in VS Code)

1. Open VS Code Chat (GitHub Copilot Chat, Claude, Cline, or Cursor Chat).
2. Open the file [PROMPT_FOR_AI.md](./PROMPT_FOR_AI.md) or attach it to your chat context (`@PROMPT_FOR_AI.md`).
3. Send this starter prompt:
   ```text
   Read the instructions in readme-craftsman/PROMPT_FOR_AI.md. 
   Act as the Readme Craftsman agent and guide me through the 4-phase process 
   to create a world-class README and app icon for SpeakFlow V2. Start with Phase 1!
   ```

---

### Method 2: GitHub Copilot in VS Code

1. Copy [vscode-integration/copilot-instructions.md](./vscode-integration/copilot-instructions.md) into your project root as `.github/copilot-instructions.md`.
2. Open Copilot Chat (`Ctrl + Alt + I` or `Cmd + Alt + I`).
3. Type:
   ```text
   @workspace Run the readme-craftsman skill to generate our project README.md and guide me through the logo and screenshot requirements.
   ```

---

### Method 3: Cursor / Windsurf

1. Copy [vscode-integration/.cursorrules](./vscode-integration/.cursorrules) into your project root as `.cursorrules`.
2. Press `Ctrl + L` / `Cmd + L` to open the Composer or Chat.
3. Type:
   ```text
   /readme-craftsman: Execute Phase 1 through Phase 4 to author a top-star GitHub README.md for this repository.
   ```

---

### Method 4: Cline / Roo Code / Claude Code

1. Set your custom system prompt or append the contents of [SKILL.md](./SKILL.md).
2. Or import [vscode-integration/cline-roomode.json](./vscode-integration/cline-roomode.json) into your custom modes.
3. Prompt your agent:
   ```text
   Activate readme-craftsman skill. Analyze the codebase, interview me on preferences, help me generate the logo, and build the README.
   ```

---

## 🔄 The 4-Phase Execution Workflow

```text
┌─────────────────────────────────────────────────────────────┐
│ Phase 1: Silent Discovery (Codebase & Memory Scan)          │
│ - Scans package.json, pyproject.toml, and project memory    │
│ - Detects tech stack, real features, and project purpose    │
├─────────────────────────────────────────────────────────────┤
│ Phase 2: .gitignore Security & Cleanliness Audit            │
│ - Checks for unignored .env, audio recordings, caches, DBs  │
│ - Hardens .gitignore so secrets never leak to GitHub        │
├─────────────────────────────────────────────────────────────┤
│ Phase 3: Socratic Onboarding Interview ("Grill Me" Loop)    │
│ - 1. Brand Logo & Social Card (uses LOGO_PROMPTS.md)        │
│ - 2. Visual Showcase (3-5 specific screenshot suggestions)   │
│ - 3. Shields.io Badges & Open Source Licensing choice       │
│ - 4. Tone & Target Audience (visual-first vs. technical)    │
├─────────────────────────────────────────────────────────────┤
│ Phase 4: Generation, Smart Merge & Delivery                 │
│ - Authors top-star README.md using Layout Blueprint A       │
│ - Adds Hero, Value Prop, Architecture Mermaid, Features     │
│ - Preserves custom setup steps and links                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎨 Generating the Logo & Icon

Inside [LOGO_PROMPTS.md](./LOGO_PROMPTS.md), you will find curated prompts specifically designed for **SpeakFlow**:
- **Option 1**: 3D Glassmorphism Speech Wave + Star Mascot (Modern, premium app style).
- **Option 2**: Vibrant Minimalist Vector Icon (Clean iOS/macOS aesthetic).
- **Option 3**: Neon Dark Mode Soundwave Shield (Cyber/tech aesthetic).

Generate the image in **Midjourney, DALL-E 3, ChatGPT, or Recraft**, then save it to:
```text
assets/logo.png          <- Square 1:1 ratio (e.g. 512x512 or 1024x1024)
assets/social-card.png   <- Landscape 16:9 ratio (1200x630 for GitHub OpenGraph)
```
The README layout will automatically center and display it at `width="160"`.
