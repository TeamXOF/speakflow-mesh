---
name: readme-craftsman
description: >
  Interactive, world-class GitHub README generator & repository polisher. Autonomously
  analyzes the codebase & memory systems, performs an itemized .gitignore security audit,
  conducts a Socratic onboarding interview ("Grill Me"-style), generates AI brand logos &
  social preview cards, guides screenshot placement, and authors top-star tier README files.
when_to_use: >
  When the user says /readme, /readme-craftsman, "generate a README", "polish my repo readme",
  "make an amazing GitHub README", "prepare my repo for public release", or wants to upgrade
  their GitHub repository presentation to the highest open-source standards.
skills:
  - documentation-templates
  - brainstorming
version: 1.0.0
effort: medium
---

# `readme-craftsman` — Top-Star GitHub README Generator & Repo Polisher

> Transform any repository into a world-class, showcase-ready open-source project that earns stars, trust, and contributors.

---

## 🎯 Purpose & Philosophy

A project's GitHub `README.md` is its digital storefront. Projects with clear value propositions, interactive visual galleries, live badges, architecture diagrams, and clean installation guides earn up to **400% more stars and contributors** than text-heavy repos.

`readme-craftsman` is not a generic template dumper. It is an **interactive craftsman agent** that:
1. **Discovers** context silently from project memory and code manifests.
2. **Hardens** your `.gitignore` to prevent dangerous API key or bytecode leaks.
3. **Interviews** the creator through a structured, friendly Socratic onboarding process.
4. **Generates** bespoke AI visual assets (App Logo + Social OpenGraph Card).
5. **Crafts & Preserves** an extraordinary, standards-compliant `README.md`.

---

## 🔄 4-Phase Execution Protocol

```
┌─────────────────────────────────────────────────────────────┐
│ Phase 1: Silent Discovery (Codebase & Memory Engine)        │
├─────────────────────────────────────────────────────────────┤
│ Phase 2: .gitignore Security & Cleanliness Audit            │
├─────────────────────────────────────────────────────────────┤
│ Phase 3: Socratic Onboarding Interview ("Grill Me" Loop)    │
├─────────────────────────────────────────────────────────────┤
│ Phase 4: Generation, Smart Merge & GitHub Sync              │
└─────────────────────────────────────────────────────────────┘
```

---

### 🔍 Phase 1: Silent Discovery (No Output Yet)

Before asking the user any questions, silently scan the repository:

1. **Check for Memory Engine:**
   - Look for `.agents/memory/MEMORY.md`, `booksage-project.md`, or custom memory files.
   - Extract: Project name, core purpose, key architectural decisions, design tokens, and roadmap status.
2. **Scan Package Manifests & Configs:**
   - Detect tech stack from `package.json`, `Cargo.toml`, `pyproject.toml`, `go.mod`, `pom.xml`, `docker-compose.yml`.
   - Identify: Frameworks, languages, UI libraries, database drivers, and runtime versions.
3. **Inspect Existing Documentation:**
   - If `README.md` exists, read it completely. Extract any custom setup steps, custom links, environment variables, or contributor notes to **preserve** during generation.
4. **Analyze Directory Structure:**
   - Identify key UI views, core modules, API routes, or CLI commands to highlight as feature pillars.

---

### 🛡️ Phase 2: `.gitignore` Security & Cleanliness Audit

Before publishing documentation, audit `.gitignore` against the detected tech stack:

1. **Scan `.gitignore` for Missing Hardening Rules:**
   - **Secrets & Credentials:** `.env`, `.env.*`, `*.pem`, `*.key`, `credentials.json`
   - **Build & Bytecode:** `node_modules/`, `dist/`, `target/`, `build/`, `__pycache__/`, `*.py[cod]`
   - **Local Databases:** `*.sqlite`, `*.db`, `*.sqlite3`
   - **OS & Editor Artifacts:** `.DS_Store`, `Thumbs.db`, `.idea/`, `.vscode/*`
2. **Present an Itemized Checklist to User:**
   - *"I analyzed your codebase and noticed your project uses [Stack]. Here is an audit of recommended `.gitignore` protections:"*
   - Let the user confirm or toggle rules before applying them.

---

### 💬 Phase 3: Socratic Onboarding Interview ("Grill Me" Loop)

Engage the user in a friendly step-by-step interview using the interactive question protocol:

#### 1. 🎨 Brand Logo & Social Preview Assets
- Ask if the user has an existing logo or wants an AI-generated brand logo and 16:9 social share card.
- If AI generation is requested:
  - Solicit style preferences (e.g. minimalist vector icon, glowing neon gradient, dark glassmorphism, modern geometric).
  - Use `generate_image` tool to create `assets/logo.png` (1:1 app icon) and `assets/social-card.png` (16:9 GitHub social preview).

#### 2. 📸 Visual Showcase & Screenshot Guidance
- Explain the conversion value of screenshots.
- Provide a bespoke list of **3 to 5 specific views** to capture based on the project's actual components (e.g., *"1. Main Reader in Spread Mode, 2. Interactive Notes Studio, 3. Copilot Sidebar"*).
- Direct the user to place images in `assets/screenshots/` (with standard filenames) and verify their existence.

#### 3. 🛡️ Badges & Licensing Consultation
- Consult `references/badges-catalog.md` to recommend relevant Shields.io badges:
  - Frameworks, languages, platform targets, and build status.
  - License options (e.g., **MIT** for maximum open-source adoption & liability protection, **Apache 2.0** for patent grants, **GPL v3** for copyleft).
- Ask the user which badges to include.

#### 4. 🎯 Tone & Target Audience
- Ask if the README should emphasize **end-user simplicity & visuals** or **deep engineering architecture & contribution**.

---

### ✍️ Phase 4: Generation, Smart Merge & Delivery

Author the `README.md` using the gold-standard layout blueprint:

1. **Hero Header:**
   - Centered Brand Logo (`assets/logo.png`, `width="160"` with subtle border radius).
   - Project Name & One-line impactful value proposition.
   - Centered Shields.io flat-square badges strip.
   - Quick navigation anchor bar (`✨ Features` • `📸 Visual Showcase` • `🏗️ Architecture` • `⚡ Quick Start` • `🗺️ Roadmap`).
2. **Value Proposition & Problem Statement:**
   - 2-paragraph clear explanation of what problem the project solves and why it is unique.
3. **Visual Showcase Gallery:**
   - Balanced HTML table layout displaying paired screenshot cards with italicized feature captions.
4. **Key Feature Pillars:**
   - 3 to 5 categorized feature sections with descriptive icons and deep, concrete bullet points.
5. **Architecture & Flow:**
   - Clean Mermaid sequence or flowchart diagram illustrating the application flow, data model, or IPC bridge.
6. **Tech Stack Breakdown Table:**
   - Layer | Technology | Rationale.
7. **Step-by-Step Quick Start Guide:**
   - Prerequisites, installation commands, dev server startup, and production build/packaging commands.
8. **Roadmap & Phase Tracker:**
   - Interactive checkbox list showing completed vs. planned milestones.
9. **Contributing & License:**
   - Standard open-source contribution steps and legal license attribution.

---

## 🧰 Skill Reference Files

- [Badges Catalog](file:///d:/%5BProject%5D/BookSage/.agents/skills/readme-craftsman/references/badges-catalog.md) — Pre-compiled Shields.io templates, color codes, and license explanations.
- [Gitignore Templates](file:///d:/%5BProject%5D/BookSage/.agents/skills/readme-craftsman/references/gitignore-templates.md) — Ecosystem-specific `.gitignore` hardening rules.
- [Layout Templates](file:///d:/%5BProject%5D/BookSage/.agents/skills/readme-craftsman/references/layout-templates.md) — Modular README blueprints for Desktop Apps, Web Apps, Libraries, and CLI Tools.

---

## 📋 Rules for the Agent

1. **Never dump a generic stub:** Every section must reflect the actual codebase, real files, and real features.
2. **Preserve existing knowledge:** Never overwrite custom setup notes or third-party links without merging them.
3. **Verify asset paths:** Ensure all embedded logos and screenshots resolve to valid workspace paths (`assets/logo.png`, `assets/screenshots/*`).
4. **Check Mermaid syntax:** Ensure node labels with brackets/quotes are safely quoted to prevent rendering glitches on GitHub.
5. **Commit & Push:** After generating the README, offer to stage, commit, and push the updates directly to GitHub.
