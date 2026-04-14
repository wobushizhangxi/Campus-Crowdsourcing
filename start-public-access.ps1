[CmdletBinding()]
param(
    [string]$LocalUrl = "http://127.0.0.1:8080"
)

$ErrorActionPreference = "Stop"

$rootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$toolDir = Join-Path $rootDir "tools\cloudflared"
$cloudflaredPath = Join-Path $rootDir "tools\cloudflared\cloudflared.exe"
$releaseDir = Join-Path $rootDir "release"
$pidPath = Join-Path $releaseDir "public-tunnel.pid"
$logPath = Join-Path $releaseDir "public-tunnel.log"
$stdoutPath = Join-Path $releaseDir "public-tunnel.stdout.log"
$errPath = Join-Path $releaseDir "public-tunnel.err.log"

if (-not (Test-Path $cloudflaredPath)) {
    New-Item -ItemType Directory -Path $toolDir -Force | Out-Null
    Write-Host "Downloading cloudflared..."
    Invoke-WebRequest `
        -Uri "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe" `
        -OutFile $cloudflaredPath
}

try {
    $response = Invoke-WebRequest -Uri $LocalUrl -UseBasicParsing -TimeoutSec 10
    if ($response.StatusCode -lt 200 -or $response.StatusCode -ge 400) {
        throw "Local application responded with status $($response.StatusCode)."
    }
} catch {
    throw "The local application is not reachable at $LocalUrl. Start the app first."
}

if (Test-Path $pidPath) {
    $existingPid = Get-Content -Path $pidPath -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($existingPid -and (Get-Process -Id $existingPid -ErrorAction SilentlyContinue)) {
        throw "A public tunnel is already running. Stop it with .\stop-public-access.ps1 first."
    }
}

New-Item -ItemType Directory -Path $releaseDir -Force | Out-Null
if (Test-Path $logPath) {
    Remove-Item -LiteralPath $logPath -Force
}
if (Test-Path $errPath) {
    Remove-Item -LiteralPath $errPath -Force
}
if (Test-Path $stdoutPath) {
    Remove-Item -LiteralPath $stdoutPath -Force
}

$process = Start-Process `
    -FilePath $cloudflaredPath `
    -ArgumentList @("tunnel", "--url", $LocalUrl, "--no-autoupdate", "--logfile", $logPath) `
    -WorkingDirectory $rootDir `
    -RedirectStandardError $errPath `
    -RedirectStandardOutput $stdoutPath `
    -PassThru

Set-Content -Path $pidPath -Value $process.Id -Encoding ascii

$deadline = (Get-Date).AddSeconds(45)
$publicUrl = $null

while ((Get-Date) -lt $deadline) {
    if (Test-Path $logPath) {
        $match = Select-String -Path $logPath -Pattern 'https://[-a-z0-9]+\.trycloudflare\.com' -AllMatches -ErrorAction SilentlyContinue |
            ForEach-Object { $_.Matches.Value } |
            Select-Object -First 1
        if ($match) {
            $publicUrl = $match
            break
        }
    }

    if ($process.HasExited) {
        break
    }

    Start-Sleep -Milliseconds 500
}

if (-not $publicUrl) {
    if (Test-Path $pidPath) {
        Remove-Item -LiteralPath $pidPath -Force
    }
    if (-not $process.HasExited) {
        Stop-Process -Id $process.Id -Force
    }
    throw "Failed to create a public URL. Check $logPath and $errPath for details."
}

Write-Host ""
Write-Host "Public access is ready."
Write-Host "URL: $publicUrl"
Write-Host "Tunnel PID: $($process.Id)"
Write-Host "Stop command: .\stop-public-access.ps1"
