# Ecosystem-Specific `.gitignore` Hardening Templates

> Reference templates for `readme-craftsman` to audit and harden `.gitignore` files before publishing.

---

## 🔒 1. Universal Secrets & Environment Variables (MANDATORY)

```gitignore
# Environment & Secret Keys
.env
.env.*
!.env.example
*.pem
*.key
*.cert
*.pfx
credentials.json
secrets.yaml
client_secrets.json
```

---

## 💻 2. Operating System & Editor Junk

```gitignore
# Operating System Files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db
desktop.ini

# IDE & Editor Directories
.idea/
*.swp
*.swo
*~
.vscode/*
!.vscode/settings.json
!.vscode/tasks.json
!.vscode/launch.json
!.vscode/extensions.json
```

---

## ☕ 3. Node.js / TypeScript / React / Next.js

```gitignore
# Node & Package Managers
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
lerna-debug.log*

# Build Outputs
dist/
dist-ssr/
build/
out/
.next/
.turbo/
.cache/
*.tsbuildinfo
```

---

## 🐍 4. Python & AI Ecosystems

```gitignore
# Bytecode & Caches
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
build/
develop-eggs/
dist/
downloads/
eggs/
.eggs/
lib/
lib64/
parts/
sdist/
var/
wheels/
*.egg-info/
.installed.cfg
*.egg

# Virtual Environments
venv/
.venv/
env/
ENV/

# Jupyter & Testing
.ipynb_checkpoints
.pytest_cache/
.coverage
htmlcov/
```

---

## 🦀 5. Rust / Tauri

```gitignore
# Rust Build Outputs
/target/
**/*.rs.bk
Cargo.lock

# Tauri App Bundles
src-tauri/target/
src-tauri/gen/
```

---

## 🗄️ 6. Local Databases & Logs

```gitignore
# Local Databases
*.sqlite
*.sqlite3
*.db
*.db-journal
*.db-wal
*.db-shm

# Log Files
logs/
*.log
```
