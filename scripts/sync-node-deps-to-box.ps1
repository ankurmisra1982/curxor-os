# Push laptop node_modules to the box when offline (COMMAND cable, no npm registry).
# Use after deploy wiped deps, or first-time offline recovery.
#
# Usage:
#   .\scripts\sync-node-deps-to-box.ps1
#   .\scripts\sync-node-deps-to-box.ps1 -SshHost curxor -ThenBuild
#
param(
    [string] $SshHost = "curxor",
    [string] $BoxIp,
    [string] $BoxUser = "ankur",
    [string] $RepoRoot = "C:\Users\ankur\curxor-os",
    [switch] $ThenBuild
)

$ErrorActionPreference = "Stop"

if ($BoxIp) { $sshTarget = "${BoxUser}@${BoxIp}" } else { $sshTarget = $SshHost }

$pillars = @(
    @{ Name = "pillar-4-dashboard"; Remote = "/opt/curxor/pillar-4-dashboard" },
    @{ Name = "pillar-2-engine"; Remote = "/opt/curxor/pillar-2-engine" }
)

Write-Host "==> Sync node_modules to box (offline npm recovery)"
Write-Host "    Box: $sshTarget"
Write-Host ""

foreach ($p in $pillars) {
    $nm = Join-Path $RepoRoot "$($p.Name)\node_modules"
    if (-not (Test-Path -LiteralPath $nm)) {
        Write-Host "SKIP $($p.Name): no local node_modules (run pnpm install on laptop first)"
        continue
    }

    $tar = Join-Path $env:TEMP ("curxor-nm-{0}.tar.gz" -f ($p.Name -replace '[^a-z0-9]', '-'))
    $remoteTar = "/tmp/curxor-nm-$($p.Name).tar.gz"

    Write-Host "==> Pack $($p.Name)/node_modules"
    Push-Location (Join-Path $RepoRoot $p.Name)
    try {
        if (Test-Path -LiteralPath $tar) { Remove-Item -LiteralPath $tar -Force }
        & tar -czf $tar node_modules
        $sizeMb = [math]::Round((Get-Item -LiteralPath $tar).Length / 1MB, 1)
        Write-Host "    Archive: $sizeMb MB"
    }
    finally {
        Pop-Location
    }

    Write-Host "==> SCP -> ${sshTarget}:${remoteTar}"
    scp $tar "${sshTarget}:${remoteTar}"
    Remove-Item -LiteralPath $tar -Force -ErrorAction SilentlyContinue

    Write-Host "==> Extract on box -> $($p.Remote)"
    $extract = "sudo rm -rf '$($p.Remote)/node_modules' && sudo tar -xzf '${remoteTar}' -C '$($p.Remote)' && sudo find '$($p.Remote)/node_modules/.bin' -type f -exec chmod +x {} + && sudo find '$($p.Remote)/node_modules' -path '*/bin/*' -type f -exec chmod +x {} + 2>/dev/null; sudo chown -R curxor:curxor '$($p.Remote)/node_modules' && rm -f '${remoteTar}' && echo OK"
    ssh -t $sshTarget $extract
    if ($LASTEXITCODE -ne 0) { throw "extract failed for $($p.Name)" }
    Write-Host ""
}

if ($ThenBuild) {
    Write-Host "==> Build dashboard on box (5-8 min)"
    ssh -t $sshTarget "sudo -u curxor bash -c 'cd /opt/curxor/pillar-4-dashboard && pnpm build' && sudo systemctl restart curxor-dashboard && curl -sf http://127.0.0.1:3080/api/setup/status && echo ' dashboard OK'"
}

Write-Host ""
Write-Host "==> Done. If dashboard still down, on box:"
Write-Host "  sudo -u curxor bash -c 'cd /opt/curxor/pillar-4-dashboard && pnpm build'"
Write-Host "  sudo systemctl restart curxor-dashboard"
