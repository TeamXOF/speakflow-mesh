# SpeakFlow V2 - Git Setup for PowerShell
# Safely navigates using -LiteralPath and applies Git settings

$projectPath = 'D:\[Project]\SpeakFlow V2'

Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "  SpeakFlow V2 - Git Setup (PowerShell)" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan

# Navigate safely with LiteralPath
Set-Location -LiteralPath $projectPath

Write-Host "[1/5] Setting Git User Identity..." -ForegroundColor Yellow
git config user.name "Waleed Khalid"
git config user.email "apex.remake@gmail.com"

Write-Host "[2/5] Configuring safe.directory exceptions..." -ForegroundColor Yellow
git config --global --add safe.directory "D:/[Project]/SpeakFlow V2"
git config --global --add safe.directory "D:\[Project]\SpeakFlow V2"

Write-Host "[3/5] Setting Credential Helper..." -ForegroundColor Yellow
git config --global credential.helper manager

Write-Host "[4/5] Checking Remote Origin..." -ForegroundColor Yellow
git remote -v

Write-Host "[5/5] Ensuring Branch is Waleed-Khalid..." -ForegroundColor Yellow
git checkout Waleed-Khalid

Write-Host ""
Write-Host "===================================================" -ForegroundColor Green
Write-Host "  Setup Complete!" -ForegroundColor Green
Write-Host "  Author: Waleed Khalid <apex.remake@gmail.com>" -ForegroundColor Green
Write-Host "  Target: https://github.com/TeamXOF/speakflow-mesh" -ForegroundColor Green
Write-Host "  Branch: Waleed-Khalid" -ForegroundColor Green
Write-Host "===================================================" -ForegroundColor Green
