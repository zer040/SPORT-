# SPORT+ Flutter - Telefonga o'rnatish skripti
Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host "       SPORT+ (Flutter) - Telefonga Yig'ish va O'rnatish" -ForegroundColor Green
Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host ""

Set-Location -Path $PSScriptRoot

Write-Host "[1/4] USB orqali ulangan qurilmalarni tekshirish (ADB)..." -ForegroundColor Yellow
adb devices
Write-Host ""
Write-Host "DIQQAT: Agar telefoningiz 'unauthorized' ko'rinsa, telefonda 'Allow USB debugging' ga ruxsat bering!" -ForegroundColor Magenta
Write-Host ""

Write-Host "[2/4] Android konfiguratsiya fayllarini tekshirish..." -ForegroundColor Yellow
if (-not (Test-Path "android\app\build.gradle") -and -not (Test-Path "android\app\build.gradle.kts")) {
    Write-Host "Android platforma fayllari yaratilmoqda..." -ForegroundColor Cyan
    flutter create . --platforms=android
}

Write-Host "[3/4] Ilovani telefonga yuklash va ishga tushirish (flutter run)..." -ForegroundColor Green
flutter run

if ($LASTEXITCODE -ne 0) {
    Write-Host "[MUQOBIL] 'flutter run' to'xtadi. Debug APK yig'ib to'g'ridan-to'g'ri o'rnatamiz..." -ForegroundColor Yellow
    flutter build apk --debug
    
    $apkPath = "build\app\outputs\flutter-apk\app-debug.apk"
    if (Test-Path $apkPath) {
        Write-Host "[4/4] APK telefoningizga o'rnatilmoqda..." -ForegroundColor Cyan
        adb install -r $apkPath
        Write-Host "Muvaffaqiyatli o'rnatildi!" -ForegroundColor Green
    }
}
