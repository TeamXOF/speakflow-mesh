@echo off
setlocal EnableDelayedExpansion
title SpeakFlow AI - Launcher
echo ==========================================================
echo    SpeakFlow AI - Smart Launcher
echo ==========================================================
set ROOT=%~dp0

:: ── Step 0: check Python and Node exist ─────────────────────────────────────
where python >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found. Install Python 3.11+ from https://python.org
    echo         IMPORTANT: tick "Add Python to PATH" during install.
    pause & exit /b 1
)
where npm >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found. Install Node.js 20+ LTS from https://nodejs.org
    pause & exit /b 1
)
echo [OK] Python and Node.js found.

:: ── Step 1: check API keys (.env) ───────────────────────────────────────────
if not exist "%ROOT%backend\.env" (
    echo.
    echo [SETUP NEEDED] backend\.env was not found.
    echo   1^) Open the backend folder
    echo   2^) Copy .env.example and rename the copy to .env
    echo      ^(in Command Prompt:  copy .env.example .env^)
    echo   3^) Fill in the two REQUIRED keys:
    echo        GOOGLE_API_KEYS  -  free key: https://aistudio.google.com/apikey
    echo        GROQ_API_KEY     -  free key: https://console.groq.com/keys
    echo   4^) Save it, then run this launcher again.
    echo.
    choice /C YN /M "Create .env from the template now so you only fill in keys? [Y/N]"
    if errorlevel 2 exit /b 0
    copy "%ROOT%backend\.env.example" "%ROOT%backend\.env" >nul
    notepad "%ROOT%backend\.env"
    echo Save .env, then run start_speakflow.bat again.
    pause & exit /b 0
)
:: .env exists — make sure the Google key line is actually filled in
findstr /R /C:"^GOOGLE_API_KEYS=." "%ROOT%backend\.env" >nul 2>&1
if errorlevel 1 (
    echo [SETUP NEEDED] backend\.env exists but GOOGLE_API_KEYS is empty.
    echo   Open backend\.env and paste your free key from https://aistudio.google.com/apikey
    notepad "%ROOT%backend\.env"
    echo Save it, then run start_speakflow.bat again.
    pause & exit /b 0
)
echo [OK] API keys found in backend\.env

:: ── Step 2: backend dependencies ────────────────────────────────────────────
if not exist "%ROOT%backend\.deps_installed" (
    echo [SETUP] Installing backend dependencies (first run only)...
    python -m pip install -r "%ROOT%backend\requirements.txt"
    if errorlevel 1 (
        echo [ERROR] pip install failed. Check your internet connection and try again.
        pause & exit /b 1
    )
    echo ok> "%ROOT%backend\.deps_installed"
)
echo [OK] Backend dependencies ready.

:: ── Step 3: frontend dependencies + build ───────────────────────────────────
if not exist "%ROOT%frontend\node_modules" (
    echo [SETUP] Installing frontend packages (first run only, a few minutes)...
    cd /d "%ROOT%frontend" && call npm install
    if errorlevel 1 (
        echo [ERROR] npm install failed. Check your internet connection and try again.
        pause & exit /b 1
    )
)
if not exist "%ROOT%frontend\.next\BUILD_ID" (
    echo [SETUP] Building the frontend (first run only, a few minutes)...
    cd /d "%ROOT%frontend" && call npm run build
    if errorlevel 1 (
        echo [ERROR] Frontend build failed.
        pause & exit /b 1
    )
)
echo [OK] Frontend ready.

:: ── Step 4: launch both servers ─────────────────────────────────────────────
echo.
echo Launching SpeakFlow AI...
start "SpeakFlow Backend" cmd /k "cd /d %ROOT%backend && python -m uvicorn main:app --port 8000"
start "SpeakFlow Frontend" cmd /k "cd /d %ROOT%frontend && npm start"

echo.
echo Both servers are starting up!
echo   Frontend:        http://localhost:3000
echo   Teacher login:   teacher / speakflow123
echo   Story Mode:      http://localhost:3000/read
echo Wait ~10 seconds, then open http://localhost:3000
echo.
echo To re-run setup (e.g. after pulling new code): delete
echo   backend\.deps_installed  and  frontend\.next\BUILD_ID  and run this again.
pause
