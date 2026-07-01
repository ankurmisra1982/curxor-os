# CurXor OS - deploy laptop repo to MS-S1 appliance (Windows)
#
# Packs repo (excludes .git, node_modules, .next), scp to box, rsync + post-update.
# On box: box-apply-deploy.sh (payload verify, CRLF strip, post-update, box-smoke).
# Passwordless when deploy sudo override is installed (box-install-deploy-sudo-override.ps1).
#
# Usage:
#   .\scripts\deploy-to-box.ps1
#   .\scripts\ship-patch.ps1                        # gate + deploy (recommended)
#   .\scripts\deploy-to-box.ps1 -SshHost curxor -BoxIp 10.0.0.1
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
elseif ($SshHost -match "@") {
    $sshTarget = $SshHost
}
else {
    $sshTarget = $SshHost
}

function Test-DeploySudoNopasswd {
    param([string] $Target)
    $probeTar = "/nonexistent/curxor-sudo-probe.tar.gz"
    $probe = ssh $Target "sudo -n ${RemoteOpt}/scripts/box-apply-deploy.sh '${probeTar}' 2>&1" 2>&1 | Out-String
    if ($probe -match 'password is required|a password is required') { return $false }
    return ($probe -match 'missing tarball')
}

function Get-DeployStamp {
    param([string] $Root)
    Push-Location -LiteralPath $Root
    try {
        $sha = (git rev-parse HEAD 2>$null)
        if ($LASTEXITCODE -ne 0 -or -not $sha) {
            return (Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ")
        }
        $branch = (git rev-parse --abbrev-ref HEAD 2>$null)
        if ($branch) { return "${sha} (${branch})" }
        return $sha
    }
    finally {
        Pop-Location
    }
}

$remoteApplyScript = "sudo ${RemoteOpt}/scripts/box-apply-deploy.sh '${RemoteTar}'"
$shCrLfStrip = 's/\r$//'
$shFindRoots = "'${RemoteOpt}/scripts' '${RemoteOpt}/pillar-4-dashboard/scripts' '${RemoteOpt}/pillar-2-engine'"
$remoteApplyInline = @"
sudo rm -rf '${RemoteTmp}' && sudo mkdir -p '${RemoteTmp}' && sudo tar -xzf '${RemoteTar}' -C '${RemoteTmp}' && test -f '${RemoteTmp}/scripts/post-update.sh' && sudo rsync -a --delete --exclude 'node_modules/' --exclude '.next/' --exclude 'dist/' '${RemoteTmp}/' '${RemoteOpt}/' && sudo find ${shFindRoots} -name '*.sh' -exec sed -i '${shCrLfStrip}' {} + && sudo bash '${RemoteOpt}/scripts/post-update.sh' && (test -x '${RemoteOpt}/scripts/box-smoke.sh' && sudo bash '${RemoteOpt}/scripts/box-smoke.sh' || (curl -sf http://127.0.0.1:3080/api/setup/status && echo ' dashboard OK'))
"@

Write-Host "==> CurXor deploy"
Write-Host "    Repo : $RepoRoot"
Write-Host "    Box  : $sshTarget"
Write-Host "    Path : ${RemoteTar} -> ${RemoteTmp} -> ${RemoteOpt}"
Write-Host ""

$localTar = Join-Path $env:TEMP ("curxor-deploy-{0:yyyyMMdd-HHmmss}.tar.gz" -f (Get-Date))
$stampPath = Join-Path $RepoRoot ".deploy-stamp"
$stampWritten = $false

if (-not $SkipPack) {
    $envLocal = Join-Path $RepoRoot "pillar-4-dashboard\.env.local"
    if (Test-Path -LiteralPath $envLocal) {
        Write-Host "==> WARNING: pillar-4-dashboard/.env.local exists (Windows dev paths)."
        Write-Host "    post-update.sh removes it on the box - do not rely on it in production."
    }

    $stamp = Get-DeployStamp -Root $RepoRoot
    [System.IO.File]::WriteAllText($stampPath, $stamp)
    $stampWritten = $true
    Write-Host "==> Deploy stamp: $stamp"

    Write-Host "==> Pack repo (exclude .git, node_modules, .next)"
    if ($WhatIf) {
        Write-Host "    [WhatIf] tar -> $localTar (includes .deploy-stamp)"
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
            if ($stampWritten -and (Test-Path -LiteralPath $stampPath)) {
                Remove-Item -LiteralPath $stampPath -Force -ErrorAction SilentlyContinue
            }
        }

        Write-Host "==> SCP archive to ${sshTarget}:${RemoteTar}"
        scp $localTar "${sshTarget}:${RemoteTar}"
        Remove-Item -LiteralPath $localTar -Force -ErrorAction SilentlyContinue
    }
}
else {
    Write-Host "==> SkipPack - assuming ${RemoteTar} already on box"
}

if ($WhatIf) {
    Write-Host "==> On-box apply (box-apply-deploy.sh preferred)"
    Write-Host "    [WhatIf] ssh $sshTarget $remoteApplyScript"
    exit 0
}

$hasApplyScript = $false
ssh $sshTarget "test -x '${RemoteOpt}/scripts/box-apply-deploy.sh'" 2>$null
$hasApplyScript = ($LASTEXITCODE -eq 0)

$useNopasswd = $false
if ($hasApplyScript) {
    $useNopasswd = Test-DeploySudoNopasswd -Target $sshTarget
    if ($useNopasswd) {
        Write-Host "==> On-box apply (passwordless deploy sudo)"
    }
    else {
        Write-Host "==> On-box apply (sudo password required - run box-install-deploy-sudo-override.ps1 once)"
    }
}
else {
    Write-Host "==> On-box apply (legacy inline - box-apply-deploy.sh not on box yet)"
}

Write-Host "    (live output from box - pnpm build can take 5-8 min)"

$remoteApply = if ($hasApplyScript) { $remoteApplyScript } else { $remoteApplyInline }

if ($useNopasswd) {
    ssh $sshTarget $remoteApply
}
else {
    ssh -t $sshTarget $remoteApply
}
$applyExit = $LASTEXITCODE

if ($applyExit -ne 0) {
    Write-Host ""
    Write-Host "==> DEPLOY INCOMPLETE (ssh exit $applyExit)." -ForegroundColor Red
    Write-Host "    Tarball is usually at ${RemoteTar}. Finish on the box:"
    Write-Host "      ssh -t $sshTarget sudo ${RemoteOpt}/scripts/box-apply-deploy.sh ${RemoteTar}"
    Write-Host "    Install passwordless deploy (one-time):"
    Write-Host "      .\scripts\box-install-deploy-sudo-override.ps1"
    exit $applyExit
}

Write-Host ""
Write-Host "==> Deploy complete"
if ($BoxIp) {
    Write-Host "    Browser: http://${BoxIp}:3080/home"
}
else {
    Write-Host "    Browser: http://10.0.0.1:3080/home  (COMMAND cable - or pass -BoxIp)"
}
Write-Host "    Stamp:   ssh $sshTarget `"cat ${RemoteOpt}/.deploy-stamp`""
$logHint = "journalctl -u curxor-dashboard -n 50 --no-pager"
Write-Host "    Logs:    ssh $sshTarget $logHint"
