# Install Next.js Linux SWC binaries on the box (offline build after Windows node_modules sync).
# Windows node_modules only has win32 SWC; next build on Linux tries to download linux SWC from npm.
#
# Usage:
#   .\scripts\sync-swc-to-box.ps1
#   .\scripts\sync-swc-to-box.ps1 -NextVersion 15.5.19 -SshHost curxor
#
param(
    [string] $SshHost = "curxor",
    [string] $BoxIp,
    [string] $BoxUser = "ankur",
    [string] $NextVersion = "15.5.19",
    [string] $DashboardRoot = "/opt/curxor/pillar-4-dashboard"
)

$ErrorActionPreference = "Stop"
if ($BoxIp) { $sshTarget = "${BoxUser}@${BoxIp}" } else { $sshTarget = $SshHost }

$packages = @(
    "@next/swc-linux-x64-gnu@${NextVersion}",
    "@next/swc-wasm-nodejs@${NextVersion}"
)

Write-Host "==> Fetch + push Next.js SWC (linux-x64-gnu + wasm fallback) for Next ${NextVersion}"
Write-Host "    Box: $sshTarget"
Write-Host ""

Push-Location $env:TEMP
try {
    foreach ($pkg in $packages) {
        $base = ($pkg -split '@')[1]
        $ver = ($pkg -split '@')[2]
        $tgz = "$base-$ver.tgz"
        if (-not (Test-Path -LiteralPath $tgz)) {
            Write-Host "==> npm pack $pkg"
            npm pack $pkg
        }
        Write-Host "==> SCP $tgz"
        scp $tgz "${sshTarget}:/tmp/$tgz"
    }
}
finally {
    Pop-Location
}

Write-Host "==> Install + build on box:"
Write-Host "  ssh $sshTarget"
Write-Host "  sudo bash /tmp/box-install-swc-and-build.sh ${NextVersion}"
Write-Host ""
Write-Host "    (Copy box-install-swc-and-build.sh first if missing: .\\scripts\\copy-script-to-box.ps1 scripts\\box-install-swc-and-build.sh)"