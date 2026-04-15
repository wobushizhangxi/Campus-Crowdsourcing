[CmdletBinding()]
param(
    [string]$InstallDir = "$env:LOCALAPPDATA\LZYApp",
    [string]$DisplayName = ([string]::Concat([char]0x79BB, [char]0x7740, [char]0x8FDC)),
    [string]$InternalExeName = "LZYApp.exe"
)

$ErrorActionPreference = "Stop"

function New-WindowsShortcut {
    param(
        [Parameter(Mandatory = $true)]
        [string]$ShortcutPath,
        [Parameter(Mandatory = $true)]
        [string]$TargetPath,
        [Parameter(Mandatory = $true)]
        [string]$WorkingDirectory
    )

    $shell = New-Object -ComObject WScript.Shell
    $shortcut = $shell.CreateShortcut($ShortcutPath)
    $shortcut.TargetPath = $TargetPath
    $shortcut.WorkingDirectory = $WorkingDirectory
    $shortcut.IconLocation = "$TargetPath,0"
    $shortcut.Save()
}

$installedExe = Join-Path $InstallDir $InternalExeName
if (-not (Test-Path $installedExe)) {
    throw "Installed executable was not found: $installedExe"
}

$desktopDir = [Environment]::GetFolderPath("Desktop")
$startMenuProgramsDir = Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs"
$startMenuAppDir = Join-Path $startMenuProgramsDir $DisplayName

New-Item -ItemType Directory -Path $startMenuAppDir -Force | Out-Null

$legacyPatterns = @(
    (Join-Path $desktopDir "LZYApp.lnk"),
    (Join-Path $desktopDir "$DisplayName.lnk"),
    (Join-Path $startMenuProgramsDir "未知\LZYApp.lnk"),
    (Join-Path $startMenuProgramsDir "未知\$DisplayName.lnk"),
    (Join-Path $startMenuProgramsDir "LZYApp.lnk"),
    (Join-Path $startMenuProgramsDir "$DisplayName.lnk")
)

foreach ($path in $legacyPatterns | Select-Object -Unique) {
    if (Test-Path $path) {
        Remove-Item -LiteralPath $path -Force
    }
}

$desktopShortcut = Join-Path $desktopDir "$DisplayName.lnk"
$startMenuShortcut = Join-Path $startMenuAppDir "$DisplayName.lnk"

New-WindowsShortcut -ShortcutPath $desktopShortcut -TargetPath $installedExe -WorkingDirectory $InstallDir
New-WindowsShortcut -ShortcutPath $startMenuShortcut -TargetPath $installedExe -WorkingDirectory $InstallDir

Write-Host "Installed executable: $installedExe"
Write-Host "Desktop shortcut: $desktopShortcut"
Write-Host "Start menu shortcut: $startMenuShortcut"
