# CurXor OS — gate, deploy, smoke (founder ship loop)
#
# Usage:
#   .\scripts\ship-patch.ps1
#   .\scripts\ship-patch.ps1 -Quick              # typecheck only (skip qa:local)
#   .\scripts\ship-patch.ps1 -SkipQa -SkipTypecheck
#   .\scripts\ship-patch.ps1 -OpsSmoke           # also run ops-wave1-smoke on box
#   .\scripts\ship-patch.ps1 -Prebuilt           # ship WSL-built .next (skip on-box dashboard build)
#   .\scripts\ship-patch.ps1 -SyncDeps           # auto sync node_modules before deploy
#   .\scripts\ship-patch.ps1 -WhatIf
#
param(
    [string] $SshHost = "curxor",
    [string] $BrowserIp = "10.0.0.1",
    [string] $RepoRoot = "C:\Users\ankur\curxor-os",

    [switch] $SkipTypecheck,

    [switch] $SkipQa,

    [switch] $Quick,

    [switch] $OpsSmoke,

    [switch] $SkipPack,

    [switch] $Prebuilt,

    [switch] $SyncDeps,

    [switch] $SkipDepsCheck,

    [switch] $WhatIf
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $RepoRoot)) {
    throw "RepoRoot not found: $RepoRoot"
}

$dashboard = Join-Path $RepoRoot "pillar-4-dashboard"
$deployScript = Join-Path $RepoRoot "scripts\deploy-to-box.ps1"

if (-not (Test-Path -LiteralPath $deployScript)) {
    throw "Missing deploy script: $deployScript"
}

Write-Host "==> CurXor ship-patch"
Write-Host "    Repo : $RepoRoot"
Write-Host "    Box  : $SshHost"
Write-Host ""

if (-not $SkipTypecheck) {
    Write-Host "==> Gate: typecheck"
    if ($WhatIf) {
        Write-Host "    [WhatIf] npm run typecheck (pillar-4-dashboard)"
    }
    else {
        Push-Location -LiteralPath $dashboard
        try {
            npm.cmd run typecheck
            if ($LASTEXITCODE -ne 0) {
                throw "typecheck failed (exit $LASTEXITCODE)"
            }
        }
        finally {
            Pop-Location
        }
    }
    Write-Host ""
}

$runQa = -not $SkipQa -and -not $Quick
if ($runQa) {
    Write-Host "==> Gate: qa:local (port 3081)"
    if ($WhatIf) {
        Write-Host "    [WhatIf] npm run qa:local -- --port 3081"
    }
    else {
        Push-Location -LiteralPath $dashboard
        try {
            npm.cmd run qa:local -- --port 3081
            if ($LASTEXITCODE -ne 0) {
                throw "qa:local failed (exit $LASTEXITCODE)"
            }
        }
        finally {
            Pop-Location
        }
    }
    Write-Host ""
}
elseif (-not $SkipQa -and $Quick) {
    Write-Host "==> Quick mode: skipped qa:local (typecheck only)"
    Write-Host ""
}

Write-Host "==> Deploy to box"
$deployArgs = @{
    SshHost  = $SshHost
    RepoRoot = $RepoRoot
}
if ($SkipPack) { $deployArgs.SkipPack = $true }
if ($Prebuilt) { $deployArgs.Prebuilt = $true }
if ($SyncDeps) { $deployArgs.SyncDeps = $true }
if ($SkipDepsCheck) { $deployArgs.SkipDepsCheck = $true }
if ($WhatIf) { $deployArgs.WhatIf = $true }

& $deployScript @deployArgs
if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
}

if ($OpsSmoke) {
    $base = "http://${BrowserIp}:3080"
    Write-Host ""
    Write-Host "==> Ops Wave 1 smoke @ $base"
    if ($WhatIf) {
        Write-Host "    [WhatIf] node scripts/ops-wave1-smoke.mjs $base"
    }
    else {
        Push-Location -LiteralPath $dashboard
        try {
            node scripts/ops-wave1-smoke.mjs $base
            if ($LASTEXITCODE -ne 0) {
                Write-Host "WARNING: ops-wave1-smoke reported failures (bridges may be unconfigured)" -ForegroundColor Yellow
            }
        }
        finally {
            Pop-Location
        }
    }
}

Write-Host ""
Write-Host "==> ship-patch complete"
Write-Host "    Browser: http://${BrowserIp}:3080/home"
Write-Host "    Stamp:   ssh $SshHost `"cat /opt/curxor/.deploy-stamp`""
