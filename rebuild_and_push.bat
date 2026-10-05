@echo off
chcp 65001 >nul
title SPORT+ - Qayta yig'ish va o'rnatish
echo ====================================================================
echo       SPORT+ Flutter — Yangilangan UI ni Telefonga Yuborish
echo ====================================================================
echo.

set "GIT_DIR=C:\Users\zer0\AppData\Local\GitHubDesktop\app-3.6.6\resources\app\git\cmd"
set "JAVA_HOME=C:\Program Files\Microsoft\jdk-17.0.20.101-hotspot"
set "PATH=%JAVA_HOME%\bin;E:\utility\flutter\bin;C:\Users\zer0\AppData\Local\Android\Sdk\platform-tools;%GIT_DIR%;%PATH%"
set "ANDROID_HOME=C:\Users\zer0\AppData\Local\Android\Sdk"
set "ANDROID_SDK_ROOT=C:\Users\zer0\AppData\Local\Android\Sdk"

set "PROJECT_DIR=%~dp0android\sport_plus_android"
cd /d "%PROJECT_DIR%"

call flutter config --jdk-dir="%JAVA_HOME%" >nul 2>&1

echo Eski kesh tozalanmoqda...
if exist "android\.gradle\kotlin" rd /s /q "android\.gradle\kotlin" >nul 2>&1

echo Paketlar yangilanmoqda (flutter pub get)...
call flutter pub get

echo.
echo APK yig'ilmoqda...
call flutter build apk --debug

set "APK=build\app\outputs\flutter-apk\app-debug.apk"

if exist "%APK%" (
    echo.
    echo Telefonni aniqlash...
    set "DEVICE_ID="
    for /f "tokens=1,2" %%A in ('adb devices ^| findstr /v "List of devices"') do (
        if "%%B"=="device" set "DEVICE_ID=%%A"
    )
    
    if not "%DEVICE_ID%"=="" (
        echo Telefon: %DEVICE_ID%
        echo APK telefoningizga nusxalanmoqda (Download papkasiga)...
        adb -s %DEVICE_ID% push "%APK%" /sdcard/Download/sport_plus.apk
        echo.
        echo ====================================================================
        echo  APK muvaffaqiyatli /sdcard/Download/sport_plus.apk ga nusxalandi.
        echo  Telefoningizda: Fayllar -^> Download -^> sport_plus.apk ochib o'rnating!
        echo ====================================================================
        
        echo.
        echo Agar "Install via USB" yoqiq bo'lsa, avtomatik o'rnatishga urinish...
        adb -s %DEVICE_ID% install -r "%APK%"
        if not errorlevel 1 (
            echo Ilovani ishga tushirilmoqda...
            adb -s %DEVICE_ID% shell monkey -p com.example.sport_plus_android -c android.intent.category.LAUNCHER 1
        )
    ) else (
        echo [DIQQAT] Telefon topilmadi. APK lokal saqlanib qoldi: %APK%
    )
) else (
    echo [XATOLIK] APK yig'ilmadi.
)

echo.
pause
