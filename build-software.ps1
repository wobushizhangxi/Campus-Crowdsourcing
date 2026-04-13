[CmdletBinding()]
param(
    [switch]$SkipTests
)

$ErrorActionPreference = "Stop"

$rootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$frontendDir = Join-Path $rootDir "campus-frontend"
$backendDir = Join-Path $rootDir "campus-backend"
$releaseDir = Join-Path $rootDir "release"
$appImageDir = Join-Path $releaseDir "app-image"
$jpackageInputDir = Join-Path $releaseDir "jpackage-input"
$jarName = "campus-backend-0.0.1-SNAPSHOT.jar"

function Resolve-JavaHome {
    $candidates = @()

    if ($env:JAVA_HOME) {
        $candidates += $env:JAVA_HOME
    }

    $candidates += Join-Path $env:USERPROFILE ".jdks\openjdk-25.0.1"
    $candidates += Join-Path $env:USERPROFILE ".jdks\openjdk-21"
    $candidates += Join-Path $env:USERPROFILE ".jdks\openjdk-17"

    foreach ($candidate in ($candidates | Where-Object { $_ } | Select-Object -Unique)) {
        if (Test-Path (Join-Path $candidate "bin\java.exe")) {
            return $candidate
        }
    }

    throw "A JDK 17 or newer installation was not found. Set JAVA_HOME before running this script."
}

$javaHome = Resolve-JavaHome
$env:JAVA_HOME = $javaHome
$env:Path = "$javaHome\bin;$env:Path"

New-Item -ItemType Directory -Path $releaseDir -Force | Out-Null

Push-Location $frontendDir
try {
    if (-not (Test-Path (Join-Path $frontendDir "node_modules"))) {
        & npm.cmd install
    }

    & npm.cmd run build
} finally {
    Pop-Location
}

Push-Location $backendDir
try {
    $mavenArgs = @("clean", "package")
    if ($SkipTests) {
        $mavenArgs = @("-DskipTests=true") + $mavenArgs
    }

    & .\mvnw.cmd @mavenArgs
} finally {
    Pop-Location
}

$jarPath = Join-Path $backendDir "target\$jarName"
Copy-Item $jarPath (Join-Path $releaseDir $jarName) -Force

$jpackagePath = Join-Path $javaHome "bin\jpackage.exe"
if (Test-Path $jpackagePath) {
    if (Test-Path $appImageDir) {
        Remove-Item -LiteralPath $appImageDir -Recurse -Force
    }
    if (Test-Path $jpackageInputDir) {
        Remove-Item -LiteralPath $jpackageInputDir -Recurse -Force
    }

    New-Item -ItemType Directory -Path $appImageDir -Force | Out-Null
    New-Item -ItemType Directory -Path $jpackageInputDir -Force | Out-Null
    Copy-Item $jarPath (Join-Path $jpackageInputDir $jarName) -Force

    & $jpackagePath `
        --type app-image `
        --dest $appImageDir `
        --name "CampusCrowdPlatform" `
        --input $jpackageInputDir `
        --main-jar $jarName `
        --main-class "org.springframework.boot.loader.launch.JarLauncher" `
        --java-options "-Dfile.encoding=UTF-8" `
        --java-options "-Dapp.open-browser=true"

    $portableZip = Join-Path $releaseDir "CampusCrowdPlatform-portable.zip"
    if (Test-Path $portableZip) {
        Remove-Item -LiteralPath $portableZip -Force
    }

    Compress-Archive `
        -Path (Join-Path $appImageDir "CampusCrowdPlatform\*") `
        -DestinationPath $portableZip
}

Write-Host ""
Write-Host "Build finished."
Write-Host "JAR: $jarPath"
if (Test-Path (Join-Path $appImageDir "CampusCrowdPlatform")) {
    Write-Host "App image: $(Join-Path $appImageDir 'CampusCrowdPlatform')"
}
