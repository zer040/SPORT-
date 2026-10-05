@echo off
title SPORT+ - Android APK Yig'ish
echo ====================================================================
echo        SPORT+ (Android) - Rasmiy APK Yig'ish
echo ====================================================================
echo.

:: 1. Git yo'lini aniqlash
set "GIT_DIR=C:\Users\zer0\AppData\Local\GitHubDesktop\app-3.6.6\resources\app\git\cmd"
if not exist "%GIT_DIR%\git.exe" (
    if exist "C:\Program Files\Git\cmd\git.exe" set "GIT_DIR=C:\Program Files\Git\cmd"
)

:: 2. Java 17 yo'lini aniqlash
set "JAVA_HOME=C:\Program Files\Microsoft\jdk-17.0.20.101-hotspot"
if not exist "%JAVA_HOME%\bin\java.exe" (
    for /d %%J in ("C:\Program Files\Microsoft\jdk-17*") do set "JAVA_HOME=%%J"
    if not exist "%JAVA_HOME%\bin\java.exe" (
        if exist "C:\Program Files\Android\Android Studio\jbr\bin\java.exe" (
            set "JAVA_HOME=C:\Program Files\Android\Android Studio\jbr"
        )
    )
)

:: 3. Android SDK va Flutter muhit yo'llari
set "ANDROID_HOME=C:\Users\zer0\AppData\Local\Android\Sdk"
set "ANDROID_SDK_ROOT=C:\Users\zer0\AppData\Local\Android\Sdk"
set "PATH=%JAVA_HOME%\bin;E:\utility\flutter\bin;C:\Users\zer0\AppData\Local\Android\Sdk\platform-tools;%GIT_DIR%;%PATH%"

echo [1/4] Muhit tekshiruvi:
echo   - Java:    %JAVA_HOME%
echo   - Git:     %GIT_DIR%
echo   - Flutter: E:\utility\flutter\bin
echo.

set "ROOT_DIR=%~dp0"
set "PROJECT_DIR=%ROOT_DIR%android\sport_plus_android"

cd /d "%PROJECT_DIR%"

echo [2/4] Flutter konfiguratsiyasi sozlanmoqda...
call flutter config --jdk-dir="%JAVA_HOME%" >nul 2>&1

if exist "android\.gradle\kotlin" rd /s /q "android\.gradle\kotlin" >nul 2>&1

echo   - Kutubxonalar yangilanmoqda (flutter pub get)...
call flutter pub get

echo.
echo [3/4] APK yig'ilmoqda (Release rejimida)...
echo (Kompilyatsiya jarayoni bir necha daqiqa vaqt olishi mumkin, kuting...)
echo --------------------------------------------------------------------
call flutter build apk --release

set "OUTPUT_APK=build\app\outputs\flutter-apk\app-release.apk"

if not exist "%OUTPUT_APK%" (
    echo.
    echo [OGOHLANTIRISH] Release APK yig'ilmadi. Debug rejimida qayta urinish...
    call flutter build apk --debug
    set "OUTPUT_APK=build\app\outputs\flutter-apk\app-debug.apk"
)

if not exist "%OUTPUT_APK%" (
    echo.
    echo ====================================================================
    echo [XATOLIK] APK yig'ish muvaffaqiyatsiz tugadi!
    echo Yuqoridagi Gradle / Kotlin loglarini ko'rib chiqing.
    echo ====================================================================
    pause
    exit /b 1
)

echo.
echo [4/4] APK loyiha asosiy papkasiga nusxalanmoqda...
copy /y "%OUTPUT_APK%" "%ROOT_DIR%SPORT_PLUS.apk" >nul

echo.
echo ====================================================================
echo   [OK] APK MUVAFFAQIYATLI YIG'ILDI!
echo ====================================================================
echo.
echo Tayyor APK fayli:
echo - Fayl:     SPORT_PLUS.apk
echo - Manzil:   %ROOT_DIR%SPORT_PLUS.apk
echo.

set "DEVICE_ID="
for /f "tokens=1,2" %%A in ('adb devices ^| findstr /v "List of devices"') do (
    if "%%B"=="device" set "DEVICE_ID=%%A"
)

if not "%DEVICE_ID%"=="" (
    echo [Telefon aniqlandi: %DEVICE_ID%]
    echo APK telefoningizning Download papkasiga yuborilmoqda...
    adb -s %DEVICE_ID% push "%ROOT_DIR%SPORT_PLUS.apk" /sdcard/Download/SPORT_PLUS.apk >nul 2>&1
    echo Telefon ekranida o'rnatish oynasi ochilmoqda...
    adb -s %DEVICE_ID% shell am start -a android.intent.action.VIEW -d "file:///sdcard/Download/SPORT_PLUS.apk" -t "application/vnd.android.package-archive" >nul 2>&1
    echo Telefonda: O'rnatish / Install tugmasini bosing!
    echo.
)

echo Papka ochilmoqda...
explorer.exe /select,"%ROOT_DIR%SPORT_PLUS.apk"

echo.
pause
