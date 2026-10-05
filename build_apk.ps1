# SPORT+ (Android) - Rasmiy APK Yig'ish (PowerShell)
Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host "       SPORT+ (Android) - Rasmiy APK Yig'ish" -ForegroundColor Green
Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host ""

# Loyiha papkasini aniqlash (har qanday joydan ishga tushganda ham)
$rootDir = $PSScriptRoot
if (-not $rootDir) {
    if (Test-Path "android\sport_plus_android") {
        $rootDir = (Get-Location).Path
    } elseif (Test-Path "lib\main.dart") {
        $rootDir = (Resolve-Path "..\..").Path
    } else {
        $rootDir = "E:\git_hub\ielts\SPORT-"
    }
}

$projectDir = Join-Path $rootDir "android\sport_plus_android"
if (-not (Test-Path $projectDir)) {
    $projectDir = $rootDir
}

# 1. Muhit yo'llari
$gitDir = "C:\Users\zer0\AppData\Local\GitHubDesktop\app-3.6.6\resources\app\git\cmd"
if (-not (Test-Path "$gitDir\git.exe")) {
    if (Test-Path "C:\Program Files\Git\cmd\git.exe") {
        $gitDir = "C:\Program Files\Git\cmd"
    }
}

$javaHome = "C:\Program Files\Microsoft\jdk-17.0.20.101-hotspot"
if (-not (Test-Path "$javaHome\bin\java.exe")) {
    $foundJava = Get-Item "C:\Program Files\Microsoft\jdk-17*" -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($foundJava) { $javaHome = $foundJava.FullName }
}

$env:JAVA_HOME = $javaHome
$env:ANDROID_HOME = "C:\Users\zer0\AppData\Local\Android\Sdk"
$env:ANDROID_SDK_ROOT = "C:\Users\zer0\AppData\Local\Android\Sdk"
$env:PATH = "$javaHome\bin;E:\utility\flutter\bin;C:\Users\zer0\AppData\Local\Android\Sdk\platform-tools;$gitDir;$env:PATH"

Write-Host "[1/4] Muhit tekshirildi:" -ForegroundColor Yellow
Write-Host "  - Java: $javaHome"
Write-Host "  - Flutter: E:\utility\flutter\bin"
Write-Host "  - Papka: $projectDir"
Write-Host ""

Set-Location -Path $projectDir

Write-Host "[2/4] Flutter sozlanmoqda va paketlar yuklanmoqda..." -ForegroundColor Yellow
flutter config --jdk-dir="$javaHome" | Out-Null
flutter pub get

Write-Host ""
Write-Host "[3/4] APK yig'ilmoqda (flutter build apk --release)..." -ForegroundColor Green
flutter build apk --release

$outputApk = Join-Path $projectDir "build\app\outputs\flutter-apk\app-release.apk"
if (-not (Test-Path $outputApk)) {
    Write-Host "[OGOHLANTIRISH] Release rejimida bo'lmadi, Debug yig'ilmoqda..." -ForegroundColor Yellow
    flutter build apk --debug
    $outputApk = Join-Path $projectDir "build\app\outputs\flutter-apk\app-debug.apk"
}

if (Test-Path $outputApk) {
    $targetApk = Join-Path $rootDir "SPORT_PLUS.apk"
    Copy-Item -Path $outputApk -Destination $targetApk -Force
    
    $fileSizeMB = [math]::Round((Get-Item $targetApk).Length / 1MB, 2)
    Write-Host ""
    Write-Host "====================================================================" -ForegroundColor Green
    Write-Host "  MUVAFFAQIYATLI YIG'ILDI!" -ForegroundColor Green
    Write-Host "====================================================================" -ForegroundColor Green
    Write-Host "  - Fayl: $targetApk" -ForegroundColor White
    Write-Host "  - Hajmi: $fileSizeMB MB" -ForegroundColor Yellow
    Write-Host ""

    # Agar telefon ulangan bo'lsa
    $devices = adb devices | Where-Object { $_ -match "\bdevice\b" -and $_ -notmatch "List of devices" }
    if ($devices) {
        $deviceId = ($devices[0] -split "`t")[0].Trim()
        Write-Host "Ulangan telefon ($deviceId) ning Download papkasiga yuklanmoqda..." -ForegroundColor Cyan
        adb -s $deviceId push $targetApk /sdcard/Download/SPORT_PLUS.apk
        Write-Host "Telefonda o'rnatish oynasi ochilmoqda..." -ForegroundColor Cyan
        adb -s $deviceId shell am start -a android.intent.action.VIEW -d "file:///sdcard/Download/SPORT_PLUS.apk" -t "application/vnd.android.package-archive"
        Write-Host "Telefonda 'Install / O'rnatish' tugmasini bosing!" -ForegroundColor Green
    }

    explorer.exe /select,$targetApk
} else {
    Write-Host "[XATOLIK] APK fayli topilmadi!" -ForegroundColor Red
}
