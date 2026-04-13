[CmdletBinding()]
param(
    [switch]$NoBrowser
)

$ErrorActionPreference = "Stop"

$rootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$releaseJar = Join-Path $rootDir "release\campus-backend-0.0.1-SNAPSHOT.jar"
$targetJar = Join-Path $rootDir "campus-backend\target\campus-backend-0.0.1-SNAPSHOT.jar"
$localConfigPath = Join-Path $rootDir "config\application-local.properties"

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

$jarPath = if (Test-Path $targetJar) { $targetJar } elseif (Test-Path $releaseJar) { $releaseJar } else {
    throw "No packaged application jar was found. Run .\build-software.ps1 first."
}

$javaHome = Resolve-JavaHome
$env:JAVA_HOME = $javaHome
$env:Path = "$javaHome\bin;$env:Path"

$openBrowser = if ($NoBrowser) { "false" } else { "true" }
$javaArgs = @(
    "-Dapp.open-browser=$openBrowser"
)

if (Test-Path $localConfigPath) {
    $javaArgs += "-Dspring.config.additional-location=optional:file:$localConfigPath"
} else {
    Write-Warning "Local config not found at $localConfigPath. Create it from config/application-local.example.properties so the admin account and JWT settings are applied."
}

Push-Location $rootDir
try {
    & (Join-Path $javaHome "bin\java.exe") @javaArgs "-jar" $jarPath
} finally {
    Pop-Location
}
