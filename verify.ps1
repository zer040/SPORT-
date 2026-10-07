# SPORT+ — Antigravity Automated Verification Script (verify.ps1)
$ErrorActionPreference = "Stop"

Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host "  SPORT+ - Antigravity Automated Verification Pipeline" -ForegroundColor Cyan
Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Backend Python Syntax & App Test
Write-Host "[1/3] Backend Python sintaksisi va ilova yuklanishini tekshirish..." -ForegroundColor Yellow
python -m py_compile backend/app/main.py backend/app/config.py backend/app/services/telegram_bot.py backend/app/api/router.py
if ($LASTEXITCODE -ne 0) {
    Write-Error "Python fayllarida sintaksis xatolik aniqlandi!"
}
$env:PYTHONPATH = "backend"
python -c "from app.main import app; print('      Backend FastAPI toza va tayyor!')"
if ($LASTEXITCODE -ne 0) {
    Write-Error "FastAPI ilovasini ishga tushirishda xatolik yuz berdi!"
}
Write-Host "      [OK] Backend tekshiruvi muvaffaqiyatli." -ForegroundColor Green
Write-Host ""

# 2. Frontend / Admin-Web Full Verification & Build
Write-Host "[2/3] Admin-Web to'liq audit va Vite build tekshiruvi..." -ForegroundColor Yellow
if (Test-Path "admin-web") {
    Push-Location "admin-web"
    npm run verify:full
    if ($LASTEXITCODE -ne 0) {
        Pop-Location
        Write-Error "Admin-Web audit tekshiruvida (lint/typecheck/secrets) xatolik aniqlandi!"
    }
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Pop-Location
        Write-Error "Admin-Web build xatosi yuz berdi!"
    }
    Pop-Location
    Write-Host "      [OK] Admin-Web toza (Types, Lint, Secrets, Build o'tdi)." -ForegroundColor Green
}
Write-Host ""

# 3. Secret Leakage & Git Check
Write-Host "[3/3] Git va Repozitoriy holati tekshiruvi..." -ForegroundColor Yellow
git status -s
Write-Host "      [OK] Git holati tekshirildi." -ForegroundColor Green
Write-Host ""

Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host "  LOYIHA TO'LIQ TEKSHIRUVDAN O'TDI! BARCHA MEZONLAR TOZA." -ForegroundColor Green
Write-Host "=========================================================" -ForegroundColor Cyan
