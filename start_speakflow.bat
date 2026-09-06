@echo off
echo Starting SpeakFlow AI Backend and Frontend...

set ROOT=%~dp0

:: Start the FastAPI Backend in a new command prompt window
start "SpeakFlow Backend" cmd /k "cd /d %ROOT%backend && python -m uvicorn main:app --port 8000"

:: Start the Next.js Frontend (production build) in a new command prompt window
start "SpeakFlow Frontend" cmd /k "cd /d %ROOT%frontend && npm start"

echo Both servers are starting up!
echo The Backend will be available at http://127.0.0.1:8000
echo The Frontend will be available at http://localhost:3000
echo   - Teacher Hub:             http://localhost:3000/teacher
echo   - Student Dashboard:       http://localhost:3000/dashboard
echo   - Story Mode:              http://localhost:3000/read
echo Please wait about 10 seconds for them to fully load.
echo (First run on a new machine: cd frontend ^&^& npm run build before npm start.)
pause
