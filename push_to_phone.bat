@echo off
title SPORT+ - APKni Telefonga O'tkazish
echo ====================================================================
echo        SPORT+ APK - Telefonga O'tkazish
echo ====================================================================
echo.

set "PATH=C:\Users\zer0\AppData\Local\Android\Sdk\platform-tools;%PATH%"

set "APK_FILE=%~dp0SPORT_PLUS.apk"

if not exist "%APK_FILE%" (
    echo [XATO] SPORT_PLUS.apk topilmadi!
    pause
    exit /b 1
)

echo [1/2] Ulangan telefonni tekshirish...
adb devices
echo.

set "DEVICE_ID="
for /f "tokens=1,2" %%A in ('adb devices ^| findstr /v "List of devices"') do (
    if "%%B"=="device" set "DEVICE_ID=%%A"
)

if "%DEVICE_ID%"=="" (
    echo [XATO] Telefon USB orqali ulanmagan yoki USB debugging o'chiq!
    echo Telefonni ulang va qayta ishga tushiring.
    pause
    exit /b 1
)

echo Ulangan telefon ID: %DEVICE_ID%
echo.
echo [2/2] APK telefoningizning Download papkasiga nusxalanmoqda...
adb -s %DEVICE_ID% push "%APK_FILE%" /sdcard/Download/SPORT_PLUS.apk
echo.
echo Telefon ekranida o'rnatish darchasini ochishga urinilmoqda...
adb -s %DEVICE_ID% shell am start -a android.intent.action.VIEW -d "file:///sdcard/Download/SPORT_PLUS.apk" -t "application/vnd.android.package-archive" >nul 2>&1

echo ====================================================================
echo   [OK] APK TELEFONINGIZGA YUKLANDI!
echo ====================================================================
echo.
echo Telefonda:
echo 1. Ekranda "O'rnatish / Install" oynasi chiqqan bo'lsa, uni bosing.
echo 2. Yoki telefoningizdagi "Fayllar (File Manager)" -^> "Download"
echo    papkasiga kiring va "SPORT_PLUS.apk" ustiga bosib o'rnating!
echo.
pause
