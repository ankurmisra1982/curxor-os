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

$remoteTmp = "/tmp/curxor-ops-digital.env"
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
    Write-Host "[WhatIf] scp $localTmp -> ${sshTarget}:${remoteTmp}"
    Write-Host "[WhatIf] install ${RemoteEnv} (600 curxor:curxor) + restart curxor-dashboard"
    Remove-Item -LiteralPath $localTmp -Force -ErrorAction SilentlyContinue
    exit 0
}

try {
    Write-Host "==> SCP (LF-normalized)"
    scp $localTmp "${sshTarget}:${remoteTmp}"
}
finally {
    Remove-Item -LiteralPath $localTmp -Force -ErrorAction SilentlyContinue
}

$install = @"
set -euo pipefail
sed -i 's/\r$//' '${remoteTmp}'
sudo mkdir -p /etc/curxor
sudo install -m 600 -o curxor -g curxor '${remoteTmp}' '${RemoteEnv}'
rm -f '${remoteTmp}'
sudo systemctl restart curxor-dashboard.service
curl -sf http://127.0.0.1:3080/api/setup/status && echo ' dashboard OK' || echo 'dashboard not ready yet (may still be restarting)'
"@

Write-Host "==> Install on box + restart dashboard"
ssh -t $sshTarget $install
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ""
Write-Host "==> ops digital.env pushed"
Write-Host "    Verify: ssh $sshTarget `"sudo ls -la ${RemoteEnv}`""
