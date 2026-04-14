[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"

$rootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$pidPath = Join-Path $rootDir "release\public-tunnel.pid"

if (-not (Test-Path $pidPath)) {
    Write-Host "No public tunnel PID file was found."
    return
}

$pidValue = Get-Content -Path $pidPath -ErrorAction SilentlyContinue | Select-Object -First 1

if ($pidValue) {
    $process = Get-Process -Id $pidValue -ErrorAction SilentlyContinue
    if ($process) {
        Stop-Process -Id $pidValue -Force
        Write-Host "Stopped public tunnel process $pidValue."
    } else {
        Write-Host "Tunnel process $pidValue is not running."
    }
}

Remove-Item -LiteralPath $pidPath -Force
