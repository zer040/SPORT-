@echo off
title SPORT+ - Android Telefonga O'rnatish
echo ====================================================================
echo        SPORT+ (Flutter) - Telefonga Yig'ish va O'rnatish
echo ====================================================================
echo.

:: 1. Muhit sozlamalari
set "GIT_DIR=C:\Users\zer0\AppData\Local\GitHubDesktop\app-3.6.6\resources\app\git\cmd"
set "JAVA_HOME=C:\Program Files\Microsoft\jdk-17.0.20.101-hotspot"
if not exist "%JAVA_HOME%\bin\java.exe" (
    for /d %%J in ("C:\Program Files\Microsoft\jdk-17*") do (
        set "JAVA_HOME=%%J"
    )
)
set "PATH=%JAVA_HOME%\bin;E:\utility\flutter\bin;C:\Users\zer0\AppData\Local\Android\Sdk\platform-tools;%GIT_DIR%;%PATH%"
set "ANDROID_HOME=C:\Users\zer0\AppData\Local\Android\Sdk"
set "ANDROID_SDK_ROOT=C:\Users\zer0\AppData\Local\Android\Sdk"

set "PROJECT_DIR=%~dp0android\sport_plus_android"
cd /d "%PROJECT_DIR%"

set "APK_FILE=build\app\outputs\flutter-apk\app-debug.apk"
set "PACKAGE_NAME=com.example.sport_plus_android"

echo [1/3] USB orqali ulangan telefonni aniqlash...
adb devices
echo.

set "DEVICE_ID="
for /f "tokens=1,2" %%A in ('adb devices ^| findstr /v "List of devices"') do (
    if "%%B"=="device" set "DEVICE_ID=%%A"
)

if "%DEVICE_ID%"=="" (
    echo --------------------------------------------------------------------
    echo [XATO] Telefon topilmadi yoki USB sozlamalari ruxsat etilmagan!
    echo.
    echo Yechim:
    echo 1. Telefonni USB kabel bilan qayta ulang.
    echo 2. Telefonda: Sozlamalar -^> Dasturchilar uchun (Developer options)
    echo    -^> "USB orqali nosozliklarni tuzatish (USB debugging)" ni yoqing.
    echo 3. Ekranda "Allow USB debugging" chiqsa -^> "Always allow" -^> OK bosing!
    echo --------------------------------------------------------------------
    pause
    exit /b 1
)

echo Ulangan telefon ID: %DEVICE_ID%
echo.

echo [2/3] APK holatini tekshirish...
if not exist "%APK_FILE%" (
    echo APK topilmadi. Yangidan yig'ilmoqda (flutter build apk --debug)...
    call flutter build apk --debug
    if not exist "%APK_FILE%" (
        echo [XATO] APK yig'ish muvaffaqiyatsiz tugadi!
        pause
        exit /b 1
    )
)

echo.
echo [3/3] APK telefoningizga o'rnatilmoqda...
echo (DIQQAT: Telefon ekranini yoqib turing. "Install / O'rnatish" so'ralsa, darhol ruxsat bering!)
echo.

set "INSTALL_LOG=%TEMP%\sport_plus_adb_install.log"
if exist "%INSTALL_LOG%" del /f /q "%INSTALL_LOG%"

adb -s %DEVICE_ID% install -r -d -g "%APK_FILE%" > "%INSTALL_LOG%" 2>&1
type "%INSTALL_LOG%"

:: Haqiqatan muvaffaqiyatli o'rnatilganligini tekshirish
findstr /i "Success" "%INSTALL_LOG%" >nul
set "ADB_SUCCESS=%ERRORLEVEL%"

:: Telefon Package Manager'dan ilova mavjudligini aniqlash
adb -s %DEVICE_ID% shell pm list packages | findstr /i "%PACKAGE_NAME%" >nul
set "PKG_EXISTS=%ERRORLEVEL%"

if "%PKG_EXISTS%"=="0" (
    echo.
    echo ====================================================================
    echo   MUVAFFAQIYATLI O'RNATILDI!
    echo ====================================================================
    echo Ilova telefonda ishga tushirilmoqda...
    adb -s %DEVICE_ID% shell am start -n %PACKAGE_NAME%/.MainActivity
    goto :FINISH
)

:: Agar to'g'ridan-to'g'ri ADB install bloklangan bo'lsa (Xiaomi / MIUI / Samsung):
echo.
echo --------------------------------------------------------------------
echo [DIQQAT] USB orqali to'g'ridan-to'g'ri o'rnatish telefon tomonidan cheklandi!
echo (Sabab: Xiaomi/Redmi da "Install via USB" o'chiq yoki xavfsizlik cheklovi).
echo.
echo Muqobil avtomatik yo'l: APK fayl telefoningizga nusxalanmoqda
echo va telefon ekranida o'rnatish oynasi ochilmoqda...
echo --------------------------------------------------------------------

adb -s %DEVICE_ID% push "%APK_FILE%" /sdcard/Download/sport_plus.apk
echo.
echo Telefon ekranida o'rnatish oynasini ochamiz...
adb -s %DEVICE_ID% shell am start -a android.intent.action.VIEW -d "file:///sdcard/Download/sport_plus.apk" -t "application/vnd.android.package-archive" >nul 2>&1

echo.
echo ====================================================================
echo TELEFONINGIZ EKRANIGA QARANG:
echo 1. Ekranda "O'rnatish / Install" oynasi ochildi.
echo 2. "O'rnatish (Install)" tugmasini bosing!
echo.
echo (Agar oyna chiqmagan bo'lsa, telefondagi "Fayllar (File Manager)" -^>
echo  "Download" papkasidagi "sport_plus.apk" ustiga bosib o'rnating).
echo ====================================================================

:FINISH
echo.
pause
