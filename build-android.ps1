[CmdletBinding()]
param(
    [string]$ApiBaseUrl,
    [string]$OutputName = "CampusCrowdPlatform-android-debug.apk"
)

$ErrorActionPreference = "Stop"

$rootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$frontendDir = Join-Path $rootDir "campus-frontend"
$releaseDir = Join-Path $rootDir "release"
$defaultAndroidSdkRoot = Join-Path $env:LOCALAPPDATA "Android\Sdk"

if (-not $env:ANDROID_HOME -and (Test-Path $defaultAndroidSdkRoot)) {
    $env:ANDROID_HOME = $defaultAndroidSdkRoot
}

if (-not $env:ANDROID_SDK_ROOT -and $env:ANDROID_HOME) {
    $env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
}

if ($env:ANDROID_HOME) {
    $env:Path = (Join-Path $env:ANDROID_HOME "platform-tools") + ";" +
        (Join-Path $env:ANDROID_HOME "cmdline-tools\latest\bin") + ";" +
        $env:Path
}

$jdk21Candidates = @(
    (Join-Path $env:ProgramFiles "Eclipse Adoptium\jdk-21.0.11.10-hotspot"),
    (Join-Path $env:ProgramFiles "Eclipse Adoptium\jdk-21*")
)

foreach ($candidate in $jdk21Candidates) {
    $resolvedCandidates = @(Get-Item -Path $candidate -ErrorAction SilentlyContinue)
    foreach ($resolvedCandidate in $resolvedCandidates) {
        if (Test-Path (Join-Path $resolvedCandidate.FullName "bin\java.exe")) {
            $env:JAVA_HOME = $resolvedCandidate.FullName
            $env:Path = (Join-Path $env:JAVA_HOME "bin") + ";" + $env:Path
            break
        }
    }

    if ($env:JAVA_HOME -and $env:JAVA_HOME -like "*jdk-21*") {
        break
    }
}

function Get-DefaultApiBaseUrl {
    $wlanAddress = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
        Where-Object {
            $_.InterfaceAlias -match "WLAN|Wi-Fi|以太网|Ethernet" -and
            $_.IPAddress -notlike "127.*" -and
            $_.IPAddress -notlike "169.254.*"
        } |
        Select-Object -First 1 -ExpandProperty IPAddress

    if ($wlanAddress) {
        return "http://$wlanAddress`:8080"
    }

    return $null
}

if (-not $ApiBaseUrl) {
    $ApiBaseUrl = $env:ANDROID_API_BASE_URL
}

if (-not $ApiBaseUrl) {
    $ApiBaseUrl = Get-DefaultApiBaseUrl
}

if (-not $ApiBaseUrl) {
    throw "ApiBaseUrl is required. Pass -ApiBaseUrl with an HTTPS backend URL or a LAN URL reachable by the Android device."
}

New-Item -ItemType Directory -Path $releaseDir -Force | Out-Null

Push-Location $frontendDir
try {
    if (-not (Test-Path (Join-Path $frontendDir "node_modules"))) {
        & npm.cmd install
    }

    $env:VITE_API_BASE_URL = $ApiBaseUrl.TrimEnd("/")
    & npm.cmd run build:android
    & npx.cmd cap sync android

    $androidDir = Join-Path $frontendDir "android"
    Push-Location $androidDir
    try {
        & .\gradlew.bat assembleDebug
    } finally {
        Pop-Location
    }
} finally {
    Pop-Location
}

$apkPath = Join-Path $frontendDir "android\app\build\outputs\apk\debug\app-debug.apk"
if (-not (Test-Path $apkPath)) {
    throw "Android build finished without producing $apkPath"
}

$outputPath = Join-Path $releaseDir $OutputName
Copy-Item $apkPath $outputPath -Force

Write-Host ""
Write-Host "Android APK built."
Write-Host "API base URL: $ApiBaseUrl"
Write-Host "APK: $outputPath"
