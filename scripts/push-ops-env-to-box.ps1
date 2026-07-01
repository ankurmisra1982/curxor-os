# Push laptop ops bridge keys to the appliance (/etc/curxor/digital.env).
# CRLF-safe · mode 600 · curxor:curxor · restarts dashboard.
#
# Usage:
#   .\scripts\push-ops-env-to-box.ps1
#   .\scripts\push-ops-env-to-box.ps1 -SshHost curxor -WhatIf
#
param(
    [string] $SshHost = "curxor",
    [string] $BoxIp,
    [string] $BoxUser = "ankur",
    [string] $RepoRoot = "C:\Users\ankur\curxor-os",
    [string] $LocalEnv,
    [string] $RemoteEnv = "/etc/curxor/digital.env",
    [switch] $WhatIf
)

$ErrorActionPreference = "Stop"

if (-not $LocalEnv) {
    $LocalEnv = Join-Path $RepoRoot "config\local\ops-digital.env"
}

if (-not (Test-Path -LiteralPath $LocalEnv)) {
    throw "Missing ${LocalEnv} - run: cd pillar-4-dashboard; npm run setup:ops-env"
}

if ($BoxIp) { $sshTarget = "${BoxUser}@${BoxIp}" } else { $sshTarget = $SshHost }

$staging = "/tmp/curxor-ops-staging"
$localTmp = Join-Path $env:TEMP ("curxor-ops-digital-{0:yyyyMMdd-HHmmss}.env" -f (Get-Date))

Write-Host "==> Push ops digital.env to box"
Write-Host "    Local  : $LocalEnv"
Write-Host "    Box    : $sshTarget"
Write-Host "    Remote : $RemoteEnv"
Write-Host ""

$raw = [System.IO.File]::ReadAllText($LocalEnv)
$lf = ($raw -replace "`r`n", "`n") -replace "`r", "`n"
[System.IO.File]::WriteAllText($localTmp, $lf, [System.Text.UTF8Encoding]::new($false))

if ($WhatIf) {
    Write-Host "[WhatIf] scp ops-digital.env + work-google-oauth.json -> ${sshTarget}:${staging}/"
    Write-Host "[WhatIf] sudo -n post-update.sh --ops-bridge-only ${staging}"
    Remove-Item -LiteralPath $localTmp -Force -ErrorAction SilentlyContinue
    exit 0
}

$staging = "/tmp/curxor-ops-staging"
$oauthLocal = Join-Path $RepoRoot "pillar-4-dashboard\scripts\dev-qa\work-google-oauth.json"
$oauthTmp = Join-Path $env:TEMP ("work-google-oauth-{0:yyyyMMdd-HHmmss}.json" -f (Get-Date))

try {
    Write-Host "==> Stage ops bridge files on box"
    ssh $sshTarget "rm -rf '${staging}' && mkdir -p '${staging}'"
    scp $localTmp "${sshTarget}:${staging}/ops-digital.env"
    if (Test-Path -LiteralPath $oauthLocal) {
        $oauthRaw = [System.IO.File]::ReadAllText($oauthLocal)
        $oauthLf = ($oauthRaw -replace "`r`n", "`n") -replace "`r", "`n"
        [System.IO.File]::WriteAllText($oauthTmp, $oauthLf, [System.Text.UTF8Encoding]::new($false))
        try {
            scp $oauthTmp "${sshTarget}:${staging}/work-google-oauth.json"
        }
        finally {
            Remove-Item -LiteralPath $oauthTmp -Force -ErrorAction SilentlyContinue
        }
    }

    $install = "sudo -n /opt/curxor/scripts/post-update.sh --ops-bridge-only '${staging}'"

    Write-Host "==> Install on box (passwordless post-update --ops-bridge-only)"
    ssh $sshTarget $install
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}
finally {
    Remove-Item -LiteralPath $localTmp -Force -ErrorAction SilentlyContinue
}

Write-Host ""
Write-Host "==> ops digital.env pushed"
Write-Host "    Verify: ssh $sshTarget `"sudo ls -la ${RemoteEnv}`""
