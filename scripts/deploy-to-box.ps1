# CurXor OS - deploy laptop repo to MS-S1 appliance (Windows)
#
# Packs repo (excludes .git, node_modules, .next), scp to box, rsync + post-update.
# On box after rsync: find /opt/curxor -name '*.sh' -exec sed -i 's/\r$//' {} +
# Ad-hoc single-script scp: use copy-script-to-box.ps1 (auto strip) — see FOUNDER-PATCH-RUNBOOK CRLF.# Prerequisite: SSH key auth to the box (see docs/curxor-os/FOUNDER-COCKPIT.md).
#
# Usage:
#   .\scripts\deploy-to-box.ps1                          # default: ~/.ssh/config Host curxor
#   .\scripts\deploy-to-box.ps1 -SshHost curxor -BoxIp 10.0.0.1
#   .\scripts\deploy-to-box.ps1 -BoxIp 10.0.0.42 -BoxUser ankur   # legacy IP form
#   .\scripts\deploy-to-box.ps1 -SshHost curxor -SkipPack
#   .\scripts\deploy-to-box.ps1 -SshHost curxor -WhatIf
#
param(
    [string] $SshHost = "curxor",

    [string] $BoxIp,

    [string] $BoxUser = "ankur",

    [string] $RepoRoot = "C:\Users\ankur\curxor-os",

    [string] $RemoteTmp = "/tmp/curxor-os",

    [string] $RemoteTar = "/tmp/curxor-deploy.tar.gz",

    [string] $RemoteOpt = "/opt/curxor",

    [switch] $SkipPack,

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

# Staging dir is often root-owned after a prior sudo box-apply-deploy — use sudo for extract.
$remoteApply = "sudo rm -rf '${RemoteTmp}' && sudo mkdir -p '${RemoteTmp}' && sudo tar -xzf '${RemoteTar}' -C '${RemoteTmp}' && test -f '${RemoteTmp}/scripts/post-update.sh' && sudo rsync -a --delete '${RemoteTmp}/' '${RemoteOpt}/' && sudo find '${RemoteOpt}' -name '*.sh' -exec sed -i 's/\r\$//' {} + && sudo bash '${RemoteOpt}/scripts/post-update.sh' && echo '--- smoke ---' && (curl -sf http://127.0.0.1:3080/api/setup/status && echo ' dashboard OK' || echo 'dashboard not ready yet') && systemctl is-active curxor-dashboard.service || true"

Write-Host "==> CurXor deploy"
Write-Host "    Repo : $RepoRoot"
Write-Host "    Box  : $sshTarget"
Write-Host "    Path : ${RemoteTar} -> ${RemoteTmp} -> ${RemoteOpt}"
Write-Host ""

$localTar = Join-Path $env:TEMP ("curxor-deploy-{0:yyyyMMdd-HHmmss}.tar.gz" -f (Get-Date))

if (-not $SkipPack) {
    $envLocal = Join-Path $RepoRoot "pillar-4-dashboard\.env.local"
    if (Test-Path -LiteralPath $envLocal) {
        Write-Host "==> WARNING: pillar-4-dashboard/.env.local exists (Windows dev paths)."
        Write-Host "    post-update.sh removes it on the box - do not rely on it in production."
    }

    Write-Host "==> Pack repo (exclude .git, node_modules, .next)"
    if ($WhatIf) {
        Write-Host "    [WhatIf] tar -> $localTar"
    }
    else {
        Push-Location -LiteralPath $RepoRoot
        try {
            if (Test-Path -LiteralPath $localTar) { Remove-Item -LiteralPath $localTar -Force }
            & tar -czf $localTar `
                --exclude=".git" `
                --exclude="node_modules" `
                --exclude=".next" `
                --exclude=".cursor" `
                .
            $sizeMb = [math]::Round((Get-Item -LiteralPath $localTar).Length / 1MB, 1)
            Write-Host "    Archive: $localTar ($sizeMb MB)"
        }
        finally {
            Pop-Location
        }

        Write-Host "==> SCP archive to ${sshTarget}:${RemoteTar}"
        scp $localTar "${sshTarget}:${RemoteTar}"
        Remove-Item -LiteralPath $localTar -Force -ErrorAction SilentlyContinue
    }
}
else {
    Write-Host "==> SkipPack - assuming ${RemoteTar} already on box"
}

Write-Host "==> On-box extract + rsync + post-update + restart"
Write-Host "    Enter sudo password when SSH prompts (required for rsync + rebuild)."
Write-Host "    Note: post-update.sh removes pillar-4-dashboard/.env.local (dev-only - breaks appliance if left in place)"

if ($WhatIf) {
    Write-Host "    [WhatIf] ssh $sshTarget (apply commands)"
    Write-Host $remoteApply
    exit 0
}

# -t allocates a TTY so sudo can prompt for password; stream output live (no capture).
Write-Host "    (live output from box — pnpm build can take 5–8 min)"
ssh -t $sshTarget $remoteApply
$applyExit = $LASTEXITCODE

if ($applyExit -ne 0) {
    Write-Host ""
    Write-Host "==> DEPLOY INCOMPLETE (ssh exit $applyExit)." -ForegroundColor Red
    Write-Host "    Tarball is usually at ${RemoteTar}. Finish on the box:"
    Write-Host "      ssh $sshTarget"
    Write-Host "      sudo bash -c 'rm -rf ${RemoteTmp} && mkdir -p ${RemoteTmp} && tar -xzf ${RemoteTar} -C ${RemoteTmp} && rsync -a --delete ${RemoteTmp}/ ${RemoteOpt}/ && find ${RemoteOpt} -name \"*.sh\" -exec sed -i \"s/\r\$//\" {} + && bash ${RemoteOpt}/scripts/post-update.sh'"
    exit $applyExit
}

Write-Host ""
Write-Host "==> Deploy complete"
if ($BoxIp) {
    Write-Host "    Browser: http://${BoxIp}:3080"
}
else {
    Write-Host "    Browser: http://<BOX_IP>:3080  (see FOUNDER-COCKPIT.md - SSH host is $SshHost)"
}
$logHint = "journalctl -u curxor-dashboard -n 50 --no-pager"
Write-Host "    Logs:    ssh $sshTarget $logHint"
