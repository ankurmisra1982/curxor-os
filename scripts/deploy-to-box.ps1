# CurXor OS - deploy laptop repo to MS-S1 appliance (Windows)
#
# Ships the whole curxor-os tree via scp, rsyncs on-box, runs post-update, restarts stack.
# Prerequisite: SSH key auth to the box (see docs/curxor-os/FOUNDER-COCKPIT.md).
#
# Usage:
#   .\scripts\deploy-to-box.ps1                          # default: ~/.ssh/config Host curxor
#   .\scripts\deploy-to-box.ps1 -SshHost curxor -BoxIp 192.168.86.211
#   .\scripts\deploy-to-box.ps1 -BoxIp 10.0.0.42 -BoxUser ankur   # legacy IP form
#   .\scripts\deploy-to-box.ps1 -SshHost curxor -SkipScp
#   .\scripts\deploy-to-box.ps1 -SshHost curxor -WhatIf
#
param(
    [string] $SshHost = "curxor",

    [string] $BoxIp,

    [string] $BoxUser = "ankur",

    [string] $RepoRoot = "C:\Users\ankur\curxor-os",

    [string] $RemoteTmp = "/tmp/curxor-os",

    [string] $RemoteOpt = "/opt/curxor",

    [switch] $SkipScp,

    [switch] $WhatIf
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $RepoRoot)) {
    throw "RepoRoot not found: $RepoRoot"
}

if ($BoxIp) {
    $sshTarget = "${BoxUser}@${BoxIp}"
}
else {
    $sshTarget = $SshHost
}
$remotePostUpdate = @"
set -euo pipefail
sudo rsync -a --delete '${RemoteTmp}/' '${RemoteOpt}/'
sudo bash '${RemoteOpt}/scripts/post-update.sh'
sudo systemctl restart curxor-os.target
echo '--- smoke ---'
curl -sf http://127.0.0.1:3080/api/setup/status && echo 'dashboard OK' || echo 'dashboard not ready yet'
systemctl is-active curxor-dashboard.service || true
"@

Write-Host "==> CurXor deploy"
Write-Host "    Repo : $RepoRoot"
Write-Host "    Box  : $sshTarget"
Write-Host "    Path : $RemoteTmp -> $RemoteOpt"
Write-Host ""

if (-not $SkipScp) {
    Write-Host "==> SCP to ${sshTarget}:${RemoteTmp}"
    if ($WhatIf) {
        Write-Host "    [WhatIf] scp -r $RepoRoot ${sshTarget}:/tmp/"
    }
    else {
        scp -r "$RepoRoot" "${sshTarget}:/tmp/"
    }
}
else {
    Write-Host "==> SkipScp - assuming payload already at $RemoteTmp"
}

Write-Host "==> On-box rsync + post-update + restart"
if ($WhatIf) {
    Write-Host "    [WhatIf] ssh $sshTarget (post-update commands)"
    Write-Host $remotePostUpdate
    exit 0
}

ssh $sshTarget $remotePostUpdate

Write-Host ""
Write-Host "==> Deploy complete"
if ($BoxIp) {
    Write-Host "    Browser: http://${BoxIp}:3080"
}
else {
    Write-Host "    Browser: http://<BOX_IP>:3080  (see FOUNDER-COCKPIT.md — SSH host is $SshHost)"
}
$logHint = "journalctl -u curxor-dashboard -n 50 --no-pager"
Write-Host "    Logs:    ssh $sshTarget $logHint"
