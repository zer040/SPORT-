@echo off
chcp 65001 >nul
title SPORT+ - Android Telefonga O'rnatish
echo ====================================================================
echo        SPORT+ (Flutter) - Telefonga Yig'ish va O'rnatish
echo ====================================================================
echo.

:: 1. Git yo'li
set "GIT_DIR=C:\Users\zer0\AppData\Local\GitHubDesktop\app-3.6.6\resources\app\git\cmd"

:: 2. Microsoft OpenJDK 17 yo'li
set "JAVA_HOME=C:\Program Files\Microsoft\jdk-17.0.20.101-hotspot"
if not exist "%JAVA_HOME%\bin\java.exe" (
    for /d %%J in ("C:\Program Files\Microsoft\jdk-17*") do (
        set "JAVA_HOME=%%J"
    )
)

:: 3. Muhit yo'llarini sozlash
set "PATH=%JAVA_HOME%\bin;E:\utility\flutter\bin;C:\Users\zer0\AppData\Local\Android\Sdk\platform-tools;%GIT_DIR%;%PATH%"
set "ANDROID_HOME=C:\Users\zer0\AppData\Local\Android\Sdk"
set "ANDROID_SDK_ROOT=C:\Users\zer0\AppData\Local\Android\Sdk"

set "APK_FILE=build\app\outputs\flutter-apk\app-debug.apk"
set "PACKAGE_NAME=com.example.sport_plus_android"

cd /d "%~dp0"

echo [1/3] USB orqali ulangan telefonni aniqlash...
adb devices
echo.

set "DEVICE_ID="
for /f "tokens=1,2" %%A in ('adb devices ^| findstr /v "List of devices"') do (
    if "%%B"=="device" set "DEVICE_ID=%%A"
)

if "%DEVICE_ID%"=="" (
    echo [XATO] Ulangan telefon aniqlanmadi yoki USB debugging o'chiq.
    pause
    exit /b 1
)

echo Ulangan telefon ID: %DEVICE_ID%
echo.

echo [2/3] APK holatini tekshirish...
if not exist "%APK_FILE%" (
    echo APK topilmadi. Debug APK yig'ilmoqda...
    call flutter build apk --debug
)

echo.
echo [3/3] APK telefoningizga o'rnatilmoqda...
set "INSTALL_LOG=%TEMP%\sport_plus_adb_install.log"
if exist "%INSTALL_LOG%" del /f /q "%INSTALL_LOG%"

adb -s %DEVICE_ID% install -r -d -g "%APK_FILE%" > "%INSTALL_LOG%" 2>&1
type "%INSTALL_LOG%"

adb -s %DEVICE_ID% shell pm list packages | findstr /i "%PACKAGE_NAME%" >nul
if "%ERRORLEVEL%"=="0" (
    echo.
    echo ====================================================================
    echo   MUVAFFAQIYATLI O'RNATILDI!
    echo ====================================================================
    echo Ilova telefonda ochilmoqda...
    adb -s %DEVICE_ID% shell am start -n %PACKAGE_NAME%/.MainActivity
    goto :FINISH
)

echo.
echo --------------------------------------------------------------------
echo [DIQQAT] USB orqali to'g'ridan-to'g'ri o'rnatish cheklandi.
echo APK telefoningizga yuklanmoqda va o'rnatish ekrani ochilmoqda...
echo --------------------------------------------------------------------
adb -s %DEVICE_ID% push "%APK_FILE%" /sdcard/Download/sport_plus.apk
adb -s %DEVICE_ID% shell am start -a android.intent.action.VIEW -d "file:///sdcard/Download/sport_plus.apk" -t "application/vnd.android.package-archive" >nul 2>&1

echo Telefoningiz ekranida "O'rnatish / Install" tugmasini bosing!

:FINISH
echo.
pause
