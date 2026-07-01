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
#   .\scripts\deploy-to-box.ps1 -SshHost curxor -Prebuilt
#   .\scripts\deploy-to-box.ps1 -SshHost curxor -SyncDeps
#   .\scripts\deploy-to-box.ps1 -SshHost curxor -WhatIf
#
param(
    [string] $SshHost = "curxor",
    [string] $BoxIp,
    [string] $BoxUser = "ankur",
    [string] $RepoRoot = "C:\Users\ankur\curxor-os",
    [string] $RemoteTmp = "/tmp/curxor-os",
    [string] $RemoteTar = "/tmp/curxor-deploy.tar.gz",
    [string] $RemotePrebuiltTar = "/tmp/curxor-prebuilt-next.tar.gz",
    [string] $RemoteOpt = "/opt/curxor",
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

$depWatchPaths = @(
    "pillar-4-dashboard/package.json",
    "pillar-4-dashboard/package-lock.json",
    "pillar-2-engine/package.json",
    "pillar-2-engine/package-lock.json"
)

function Get-RemoteDeploySha {
    param([string] $Target)
    $raw = (ssh $Target "cat '${RemoteOpt}/.deploy-stamp' 2>/dev/null" 2>$null | Out-String).Trim()
    if ($raw -match '^([0-9a-f]{7,40})') { return $matches[1] }
    return $null
}

function Test-LocalFileHash {
    param([string] $Path)
    if (-not (Test-Path -LiteralPath $Path)) { return $null }
    return (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant()
}

function Get-RemoteFileHash {
    param(
        [string] $Target,
        [string] $RemotePath
    )
    $line = (ssh $Target "sha256sum '${RemotePath}' 2>/dev/null" 2>$null | Out-String).Trim()
    if ($line -match '^([0-9a-f]{64})') { return $matches[1] }
    return $null
}

function Test-DepsChangedSinceLastDeploy {
    param([string] $Target)

    $lastSha = Get-RemoteDeploySha -Target $Target
    if ($lastSha) {
        Push-Location -LiteralPath $RepoRoot
        try {
            $changed = (& git diff --name-only $lastSha HEAD -- @depWatchPaths 2>$null | Where-Object { $_ })
            if ($changed) { return $true }
            return $false
        }
        finally {
            Pop-Location
        }
    }

    foreach ($rel in $depWatchPaths) {
        $local = Join-Path $RepoRoot ($rel -replace '/', '\')
        $remote = "${RemoteOpt}/$($rel -replace '\\', '/')"
        $lh = Test-LocalFileHash -Path $local
        $rh = Get-RemoteFileHash -Target $Target -RemotePath $remote
        if ($lh -and $rh -and $lh -ne $rh) { return $true }
    }
    return $false
}

function Invoke-DepsSyncOffer {
    param([string] $Target)

    Write-Host "==> WARNING: package.json or lockfile changed since last box deploy." -ForegroundColor Yellow
    Write-Host "    Run before deploy (offline box needs laptop node_modules):"
    Write-Host "      .\scripts\sync-node-deps-to-box.ps1"
    Write-Host "      .\scripts\sync-swc-to-box.ps1    # if node_modules came from Windows"
    Write-Host ""

    if ($SyncDeps) {
        Write-Host "==> -SyncDeps: running sync-node-deps-to-box.ps1"
        $syncDepsScript = Join-Path $RepoRoot "scripts\sync-node-deps-to-box.ps1"
        & $syncDepsScript -SshHost $SshHost
        if ($LASTEXITCODE -ne 0) { throw "sync-node-deps-to-box failed (exit $LASTEXITCODE)" }

        Write-Host "==> -SyncDeps: running sync-swc-to-box.ps1"
        $syncSwcScript = Join-Path $RepoRoot "scripts\sync-swc-to-box.ps1"
        & $syncSwcScript -SshHost $SshHost
        if ($LASTEXITCODE -ne 0) { throw "sync-swc-to-box failed (exit $LASTEXITCODE)" }
        Write-Host ""
        return
    }

    if ($WhatIf) {
        Write-Host "    [WhatIf] would prompt to run sync-node-deps (or pass -SyncDeps)"
        return
    }

    if ([Console]::IsInputRedirected) {
        Write-Host "    Non-interactive session - continuing deploy (pass -SyncDeps to auto-sync)."
        Write-Host ""
        return
    }

    $answer = Read-Host "Run sync-node-deps-to-box.ps1 now? [y/N]"
    if ($answer -match '^[Yy]') {
        $syncDepsScript = Join-Path $RepoRoot "scripts\sync-node-deps-to-box.ps1"
        & $syncDepsScript -SshHost $SshHost
        if ($LASTEXITCODE -ne 0) { throw "sync-node-deps-to-box failed (exit $LASTEXITCODE)" }

        $swcAnswer = Read-Host "Also run sync-swc-to-box.ps1 (Windows node_modules)? [y/N]"
        if ($swcAnswer -match '^[Yy]') {
            $syncSwcScript = Join-Path $RepoRoot "scripts\sync-swc-to-box.ps1"
            & $syncSwcScript -SshHost $SshHost
            if ($LASTEXITCODE -ne 0) { throw "sync-swc-to-box failed (exit $LASTEXITCODE)" }
        }
        Write-Host ""
    }
}

Write-Host "==> CurXor deploy"
Write-Host "    Repo : $RepoRoot"
Write-Host "    Box  : $sshTarget"
Write-Host "    Path : ${RemoteTar} -> ${RemoteTmp} -> ${RemoteOpt}"
if ($Prebuilt) { Write-Host "    Mode : prebuilt .next (skip on-box dashboard build)" }
Write-Host ""

if (-not $SkipDepsCheck -and -not $WhatIf) {
    $depsProbe = ssh $sshTarget "test -f '${RemoteOpt}/.deploy-stamp'" 2>$null
    if ($LASTEXITCODE -eq 0) {
        if (Test-DepsChangedSinceLastDeploy -Target $sshTarget) {
            Invoke-DepsSyncOffer -Target $sshTarget
        }
    }
}
elseif (-not $SkipDepsCheck -and $WhatIf) {
    Write-Host "==> [WhatIf] deps check vs box .deploy-stamp + lockfile hashes"
}

$localTar = Join-Path $env:TEMP ("curxor-deploy-{0:yyyyMMdd-HHmmss}.tar.gz" -f (Get-Date))
$localPrebuiltTar = Join-Path $env:TEMP ("curxor-prebuilt-next-{0:yyyyMMdd-HHmmss}.tar.gz" -f (Get-Date))
if ([string]::IsNullOrWhiteSpace($RepoRoot)) {
    throw "RepoRoot is empty - pass -RepoRoot C:\Users\ankur\curxor-os"
}
$stampPath = [System.IO.Path]::Combine($RepoRoot, ".deploy-stamp")
$stampWritten = $false
$prebuiltPacked = $false

if ($Prebuilt) {
    $nextDir = Join-Path $RepoRoot "pillar-4-dashboard\.next"
    if (-not (Test-Path -LiteralPath $nextDir)) {
        throw "Prebuilt deploy requires pillar-4-dashboard/.next - build on WSL/Linux first (see FOUNDER-PATCH-RUNBOOK.md)"
    }
}

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

        if ($Prebuilt) {
            Write-Host "==> Pack prebuilt .next"
            Push-Location (Join-Path $RepoRoot "pillar-4-dashboard")
            try {
                if (Test-Path -LiteralPath $localPrebuiltTar) { Remove-Item -LiteralPath $localPrebuiltTar -Force }
                & tar -czf $localPrebuiltTar .next
                $prebuiltMb = [math]::Round((Get-Item -LiteralPath $localPrebuiltTar).Length / 1MB, 1)
                Write-Host "    Prebuilt archive: $localPrebuiltTar ($prebuiltMb MB)"
            }
            finally {
                Pop-Location
            }

            Write-Host "==> SCP prebuilt .next -> ${sshTarget}:${RemotePrebuiltTar}"
            scp $localPrebuiltTar "${sshTarget}:${RemotePrebuiltTar}"
            Remove-Item -LiteralPath $localPrebuiltTar -Force -ErrorAction SilentlyContinue
            $prebuiltPacked = $true
        }
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

if (-not $prebuiltPacked) {
    ssh $sshTarget "rm -f '${RemotePrebuiltTar}'" 2>$null
}

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
