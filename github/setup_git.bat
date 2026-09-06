@echo off
echo ===================================================
echo   SpeakFlow V2 - Git Setup for Waleed Khalid / Z Code
echo ===================================================

cd /d "D:\[Project]\SpeakFlow V2"

echo [1/5] Setting Git User Identity...
git config user.name "Waleed Khalid"
git config user.email "apex.remake@gmail.com"

echo [2/5] Adding safe.directory exceptions for bracketed paths...
git config --global --add safe.directory "D:/[Project]/SpeakFlow V2"
git config --global --add safe.directory "D:\[Project]\SpeakFlow V2"

echo [3/5] Setting Credential Helper...
git config --global credential.helper manager

echo [4/5] Checking Remote Origin...
git remote -v

echo [5/5] Ensuring Branch is Waleed-Khalid...
git checkout Waleed-Khalid

echo.
echo ===================================================
echo   Setup Complete!
echo   Author: Waleed Khalid ^<apex.remake@gmail.com^>
echo   Target: https://github.com/TeamXOF/speakflow-mesh
echo   Branch: Waleed-Khalid
echo ===================================================
pause
