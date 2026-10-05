@echo off
chcp 65001 >nul
title SPORT+ CRM - Administrator Boshqaruv Markazi
echo ====================================================================
echo              SPORT+ CRM — Administrator Boshqaruv Markazi
echo ====================================================================
echo.
echo [1] Cloud CRM (Eng qulay: https://sport-jmu3.onrender.com/admin)
echo     - 24/7 bulutda ishlab turibdi, hech narsa o'rnatmasdan brauzerda ochiladi.
echo.
echo [2] Lokal React CRM (admin-web: http://localhost:5173)
echo     - Vite + React interfeysi, Render bulut API ga to'liq ulangan.
echo.
echo [3] Lokal Python Backend + Admin (http://localhost:8000/admin)
echo.
set /p CHOICE="Tanlovingiz (1, 2 yoki 3, Default: 1): "

if "%CHOICE%"=="2" goto run_react
if "%CHOICE%"=="3" goto run_backend

:run_cloud
echo.
echo Brauzerda Cloud CRM ochilmoqda...
start https://sport-jmu3.onrender.com/admin
goto end

:run_react
echo.
echo React Web CRM ishga tushirilmoqda (admin-web)...
cd /d "%~dp0admin-web"
start http://localhost:5173
call npm run dev
goto end

:run_backend
echo.
echo Lokal Backend CRM ishga tushirilmoqda (FastAPI)...
cd /d "%~dp0backend"
start http://localhost:8000/admin
call uvicorn app.main:app --reload
goto end

:end
pause
