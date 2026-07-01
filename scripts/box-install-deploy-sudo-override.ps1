# Sync deploy-sudo assets to the MS-S1 box and finish install (run from laptop).
# One interactive SSH session for sudo password (last time, if NOPASSWD not yet installed).
#
# Usage:
#   .\scripts\box-install-deploy-sudo-override.ps1
#   .\scripts\box-install-deploy-sudo-override.ps1 -SshHost curxor -DeployUser ankur
#
param(
    [string] $SshHost = "curxor",
    [string] $BoxIp,
    [string] $BoxUser = "ankur",
    [string] $DeployUser = "ankur",
    [string] $RepoRoot = "C:\Users\ankur\curxor-os"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $RepoRoot)) {
    throw "RepoRoot not found: $RepoRoot"
}

$sshTarget = if ($BoxIp) { "${BoxUser}@${BoxIp}" } else { $SshHost }
$stage = "/tmp/curxor-deploy-sudo-sync"
$shCrLfStrip = 's/\r$//'

$uploads = @(
    @{ Local = "scripts\box-finish-deploy-sudo-override.sh"; Name = "box-finish-deploy-sudo-override.sh" },
    @{ Local = "scripts\install-deploy-sudo-override.sh"; Name = "install-deploy-sudo-override.sh" },
    @{ Local = "scripts\verify-deploy-sudo-override.sh"; Name = "verify-deploy-sudo-override.sh" },
    @{ Local = "scripts\box-apply-deploy.sh"; Name = "box-apply-deploy.sh" },
    @{ Local = "scripts\box-smoke.sh"; Name = "box-smoke.sh" },
    @{ Local = "config\sudo\curxor-deploy.sudoers.in"; Name = "curxor-deploy.sudoers.in" }
)

Write-Host "==> CurXor box deploy sudo override"
Write-Host "    Target: $sshTarget"
Write-Host "    Deploy user: $DeployUser"
Write-Host ""

ssh $sshTarget "mkdir -p '$stage'"

foreach ($u in $uploads) {
    $localPath = Join-Path $RepoRoot $u.Local
    if (-not (Test-Path -LiteralPath $localPath)) {
        throw "Missing local file: $localPath"
    }
    Write-Host "==> Upload $($u.Local)"
    scp $localPath "${sshTarget}:${stage}/$($u.Name)"
}

Write-Host ""
Write-Host "==> Finish on box (enter sudo password when prompted)"
$remoteFinish = "sed -i '${shCrLfStrip}' ${stage}/*.sh 2>/dev/null; sudo CURXOR_DEPLOY_USER='${DeployUser}' bash ${stage}/box-finish-deploy-sudo-override.sh"
ssh -t $sshTarget $remoteFinish
$finishExit = $LASTEXITCODE

if ($finishExit -ne 0) {
    Write-Host ""
    Write-Host "==> FAILED (ssh exit $finishExit). On box, recover manually:" -ForegroundColor Red
    Write-Host "  ssh -t $sshTarget"
    Write-Host "  sed -i 's/\r`$//' ${stage}/*.sh"
    Write-Host "  sudo CURXOR_DEPLOY_USER=${DeployUser} bash ${stage}/box-finish-deploy-sudo-override.sh"
    exit $finishExit
}

Write-Host ""
Write-Host "==> Done - test with:"
Write-Host "  ssh $sshTarget `"sudo /opt/curxor/scripts/verify-deploy-sudo-override.sh`""
