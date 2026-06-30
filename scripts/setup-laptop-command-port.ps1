# Split-route laptop networking: Wi-Fi = internet, COMMAND Ethernet = CurXor box only.
#
# Run as Administrator after plugging the COMMAND USB Ethernet cable:
#   powershell -ExecutionPolicy Bypass -File .\scripts\setup-laptop-command-port.ps1
#
param(
    [string] $CommandAlias,
    [string] $CommandIp = "10.0.0.2",
    [string] $BoxIp = "10.0.0.1",
    [int] $CommandMetric = 75,
    [int] $WifiMetric = 25,
    [switch] $Quiet,
    [switch] $SkipVerification
)

$ErrorActionPreference = "Stop"

function Write-Info([string]$Message) {
    if (-not $Quiet) {
        Write-Host $Message
    }
}

function Require-Admin {
    $id = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($id)
    if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
        throw "Re-open PowerShell as Administrator, then run this script again."
    }
}

Require-Admin

if (-not $Quiet) {
    Write-Host "CurXor COMMAND port setup"
    Write-Host "========================="
    Write-Host ""
}

if (-not $CommandAlias) {
    $candidates = @(
        Get-NetAdapter -Physical -ErrorAction SilentlyContinue |
            Where-Object {
                $_.Status -eq "Up" -and (
                    $_.InterfaceDescription -like "*ASIX*" -or
                    $_.InterfaceDescription -like "*USB*Ethernet*" -or
                    $_.InterfaceDescription -like "*Realtek*USB*" -or
                    $_.Name -like "Ethernet*"
                )
            }
    )
    if ($candidates.Count -eq 1) {
        $CommandAlias = $candidates[0].Name
    }
    elseif ($candidates.Count -gt 1) {
        Write-Info "Multiple Ethernet adapters are up. Pass -CommandAlias explicitly:"
        if (-not $Quiet) {
            $candidates | Format-Table Name, InterfaceDescription, Status
        }
        exit 1
    }
    else {
        if ($Quiet) {
            exit 0
        }
        throw "No COMMAND Ethernet adapter found. Plug the USB cable, wait for Connected, then re-run."
    }
}

$wifi = Get-NetAdapter -Name "Wi-Fi" -ErrorAction SilentlyContinue
if ($wifi -and $wifi.Status -eq "Up") {
    Write-Info ("==> Wi-Fi uplink: " + $wifi.Name)
    Set-NetIPInterface -InterfaceAlias $wifi.Name -AddressFamily IPv4 -InterfaceMetric $WifiMetric
}
else {
    $dashUrl = "http://" + $BoxIp + ":3080/home"
    Write-Info ("==> Wi-Fi not connected. COMMAND cable only. Dashboard: " + $dashUrl)
}

Write-Info ("==> COMMAND adapter: " + $CommandAlias)

netsh interface ip set address name="$CommandAlias" static $CommandIp 255.255.255.0 none | Out-Null
Set-DnsClientServerAddress -InterfaceAlias $CommandAlias -ResetServerAddresses
Set-NetIPInterface -InterfaceAlias $CommandAlias -AddressFamily IPv4 -InterfaceMetric $CommandMetric

Get-NetRoute -DestinationPrefix "0.0.0.0/0" -InterfaceAlias $CommandAlias -ErrorAction SilentlyContinue |
    Remove-NetRoute -Confirm:$false -ErrorAction SilentlyContinue

$existing = Get-NetRoute -DestinationPrefix "10.0.0.0/24" -InterfaceAlias $CommandAlias -ErrorAction SilentlyContinue
if ($existing) {
    $existing | Remove-NetRoute -Confirm:$false
}

$ifIndex = (Get-NetAdapter -Name $CommandAlias).ifIndex

# route.exe is reliable across Windows builds (New-NetRoute -PolicyStore often fails).
cmd /c "route delete 10.0.0.0 mask 255.255.255.0 $BoxIp >nul 2>nul"
$routeOut = cmd /c "route add 10.0.0.0 mask 255.255.255.0 $BoxIp metric 1 if $ifIndex -p 2>&1"
if ($LASTEXITCODE -ne 0 -and $routeOut -notmatch "already exists") {
    Write-Info ("WARN: route add failed: " + $routeOut)
}

if (-not $Quiet -and -not $SkipVerification) {
    Write-Host ""
    Write-Host "==> Verification (may take up to 30s if the box is offline)..."
    Write-Host ""

    if ($wifi -and $wifi.Status -eq "Up") {
        Write-Host "DNS (google.com):"
        Resolve-DnsName google.com -Type A -ErrorAction SilentlyContinue |
            Select-Object -First 3 Name, IPAddress |
            Format-Table
    }

    $boxTcp = Test-NetConnection $BoxIp -Port 3080 -WarningAction SilentlyContinue
    Write-Host ("CurXor dashboard (" + $BoxIp + ":3080): tcp=" + $boxTcp.TcpTestSucceeded)

    if ($wifi -and $wifi.Status -eq "Up") {
        $inet = Test-NetConnection 8.8.8.8 -WarningAction SilentlyContinue
        Write-Host ("Internet (8.8.8.8): ping=" + $inet.PingSucceeded)
    }
}

if (-not $Quiet) {
    Write-Host ""
    Write-Host "Done."
    Write-Host ("  Dashboard: http://" + $BoxIp + ":3080/home")
    Write-Host "  SSH:       ssh curxor"
    Write-Host ""
    Write-Host "Note: Ethernet may show No internet in Settings. That is normal."
    Write-Host "      Wi-Fi keeps your normal internet. Cable is 10.0.0.x only."
}
