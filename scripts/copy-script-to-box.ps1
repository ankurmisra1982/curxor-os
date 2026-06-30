# Copy a single .sh script to the box and strip CRLF on the remote (required after Windows scp).
#
# Usage:
#   .\scripts\copy-script-to-box.ps1 scripts\reset-appliance-data.sh
#   .\scripts\copy-script-to-box.ps1 -SshHost curxor -RemoteDir /tmp scripts\reset-appliance-data.sh
#
param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string] $ScriptPath,

    [string] $SshHost = "curxor",

    [string] $BoxIp,

    [string] $BoxUser = "ankur",

    [string] $RemoteDir = "/tmp"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $ScriptPath)) {
    throw "Script not found: $ScriptPath"
}

$name = Split-Path -Leaf $ScriptPath
if ($BoxIp) {
    $sshTarget = "${BoxUser}@${BoxIp}"
}
else {
    $sshTarget = $SshHost
}
$remote = "${RemoteDir}/${name}"

Write-Host "==> SCP $ScriptPath -> ${sshTarget}:${remote}"
scp $ScriptPath "${sshTarget}:${remote}"

Write-Host "==> Strip CRLF on box (required after Windows scp)"
ssh $sshTarget "sed -i 's/\r$//' '${remote}' && echo 'OK: stripped CRLF -> ${remote}'"

Write-Host ""
Write-Host "Run on box:"
Write-Host "  ssh $sshTarget"
Write-Host "  sudo bash ${remote}"
