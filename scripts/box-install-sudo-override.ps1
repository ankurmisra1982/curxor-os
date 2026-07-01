# Sync sudo-override assets to the MS-S1 box and finish install (run from laptop).
# Opens one interactive SSH session for sudo password.
#
# Usage:
#   .\scripts\box-install-sudo-override.ps1
#   .\scripts\box-install-sudo-override.ps1 -SshHost curxor
#
param(
    [string] $SshHost = "curxor",
    [string] $BoxIp,
    [string] $BoxUser = "ankur",
    [string] $RepoRoot = "C:\Users\ankur\curxor-os"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $RepoRoot)) {
    throw "RepoRoot not found: $RepoRoot"
}

$sshTarget = if ($BoxIp) { "${BoxUser}@${BoxIp}" } else { $SshHost }
$stage = "/tmp/curxor-sudo-sync"

$uploads = @(
    @{ Local = "scripts\install-sudo-override.sh"; Name = "install-sudo-override.sh" },
    @{ Local = "scripts\verify-sudo-override.sh"; Name = "verify-sudo-override.sh" },
    @{ Local = "scripts\box-finish-sudo-override.sh"; Name = "box-finish-sudo-override.sh" },
    @{ Local = "config\sudo\curxor-dashboard.sudoers.in"; Name = "curxor-dashboard.sudoers.in" },
    @{ Local = "pillar-4-dashboard\systemd\curxor-dashboard.service"; Name = "curxor-dashboard.service" }
)

Write-Host "==> CurXor box sudo override finish"
Write-Host "    Target: $sshTarget"
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
ssh -t $sshTarget "sed -i 's/\r$//' ${stage}/*.sh 2>/dev/null; sudo bash ${stage}/box-finish-sudo-override.sh"

Write-Host ""
Write-Host "==> Done"
