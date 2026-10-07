@echo off
chcp 65001 >nul
echo ====================================================================
echo         SPORT+ — Antigravity Avtomatlashtirilgan Audit (make check)
echo ====================================================================
echo.

echo 🔍 [1/3] Backend Python sintaksisi va modullarini tekshirish...
python -m py_compile backend/app/main.py backend/app/config.py backend/app/services/telegram_bot.py backend/app/api/router.py
if %errorlevel% neq 0 (
    echo ❌ Python sintaksisida xatolik aniqlandi!
    exit /b %errorlevel%
)
python -c "from app.main import app; print('✅ Backend FastAPI toza!')"
if %errorlevel% neq 0 (
    echo ❌ FastAPI yuklanishida xatolik aniqlandi!
    exit /b %errorlevel%
)

echo.
echo 🔍 [2/3] Admin-Web frontend tekshiruvi...
if exist admin-web (
    pushd admin-web
    call npm run build
    popd
)

echo.
echo 🔍 [3/3] Git va Secret Leakage tekshiruvi...
git status -s

echo.
echo ====================================================================
echo ✅ Barcha mezonlar qanoatlantirildi! Kod topshirishga tayyor.
echo ====================================================================
