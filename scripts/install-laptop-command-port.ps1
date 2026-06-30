# One-time install: auto-fix laptop routing when the COMMAND cable is connected.
# Keeps Wi-Fi internet working alongside the CurXor box on 10.0.0.1.
#
# Run as Administrator from the curxor-os repo:
#   powershell -ExecutionPolicy Bypass -File .\scripts\install-laptop-command-port.ps1
#
param(
    [switch] $Uninstall
)

$ErrorActionPreference = "Stop"
$TaskName = "CurXor COMMAND Port Split Route"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$SetupScript = Join-Path $ScriptDir "setup-laptop-command-port.ps1"
$Runner = "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$SetupScript`" -Quiet"

function Write-Step([string]$Message) {
    Write-Host "==> $Message"
}

function Invoke-SchTask {
    param(
        [string[]]$ArgumentList,
        [string]$Label,
        [switch]$AllowFailure
    )

    Write-Step $Label
    $output = & schtasks @ArgumentList 2>&1
    $exitCode = $LASTEXITCODE
    if ($output) {
        foreach ($line in @($output)) {
            Write-Host "    $line"
        }
    }
    if ($exitCode -ne 0 -and -not $AllowFailure) {
        throw "schtasks failed (exit $exitCode): $output"
    }
    elseif ($exitCode -ne 0) {
        Write-Host "    (skipped or not present)" -ForegroundColor DarkYellow
    }
    return ($exitCode -eq 0)
}

Write-Host ""
Write-Host "CurXor COMMAND port installer"
Write-Host "============================="
Write-Host ""

function Require-Admin {
    $id = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($id)
    if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
        throw "Run as Administrator."
    }
}

Write-Step "Checking administrator privileges..."
Require-Admin
Write-Host "    OK (running elevated)"

if ($Uninstall) {
    Invoke-SchTask @("/Delete", "/TN", $TaskName, "/F") -Label "Removing logon task..." -AllowFailure
    $eventTask = "${TaskName} (network)"
    Invoke-SchTask @("/Delete", "/TN", $eventTask, "/F") -Label "Removing network event task..." -AllowFailure
    Write-Host ""
    Write-Host "Uninstall complete."
    exit 0
}

if (-not (Test-Path -LiteralPath $SetupScript)) {
    throw "Missing $SetupScript"
}

Invoke-SchTask @(
    "/Create", "/F", "/TN", $TaskName, "/SC", "ONLOGON", "/RL", "HIGHEST", "/TR", $Runner
) -Label "Registering logon task (runs at sign-in)..."

Invoke-SchTask @(
    "/Change", "/TN", $TaskName, "/RI", "1", "/DU", "24:00", "/ENABLE"
) -Label "Tuning logon task repeat interval..." -AllowFailure

$eventTask = "${TaskName} (network)"
$eventChannel = "Microsoft-Windows-NetworkProfile/Operational"
$eventQuery = '*[System[EventID=10000]]'

Invoke-SchTask @("/Delete", "/TN", $eventTask, "/F") -Label "Removing old network plug-in task..." -AllowFailure
$networkOk = Invoke-SchTask @(
    "/Create", "/F", "/TN", $eventTask, "/SC", "ONEVENT",
    "/EC", $eventChannel, "/MO", $eventQuery, "/RL", "HIGHEST", "/TR", $Runner
) -Label "Registering network plug-in task (runs when a network connects)..." -AllowFailure

Write-Host ""
Write-Host "Installed:"
Write-Host "  - $TaskName (at logon)"
if ($networkOk) {
    Write-Host "  - $eventTask (when a network connects)"
}
else {
    Write-Host "  - $eventTask (skipped - logon task still covers cable plug after sign-in)"
}
Write-Host ""
Write-Host "Plug COMMAND cable + stay on Wi-Fi - internet stays up."

Write-Step "Applying routing now (quick; skips connectivity tests)..."
& $SetupScript -Quiet -SkipVerification
if ($LASTEXITCODE -ne 0) {
    Write-Host "    Setup reported an issue (exit $LASTEXITCODE). Re-run setup manually after plugging the cable." -ForegroundColor Yellow
}
else {
    Write-Host "    Done (or skipped if COMMAND cable is not connected yet)."
}

Write-Host ""
Write-Host "Install complete."
Write-Host "Verify tasks: schtasks /Query /TN `"$TaskName`""
Write-Host ""
