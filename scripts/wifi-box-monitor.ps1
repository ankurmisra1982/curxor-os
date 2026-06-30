# Monitor Wi-Fi + COMMAND cable connectivity. Logs to repo root wifi-box-monitor.log
param(
    [int] $Checks = 20,
    [int] $IntervalSeconds = 90,
    [string] $LogPath = "$PSScriptRoot\..\wifi-box-monitor.log"
)

$LogPath = (Resolve-Path -LiteralPath (Split-Path $LogPath -Parent) -ErrorAction SilentlyContinue).Path
if (-not $LogPath) {
    $LogPath = Join-Path (Split-Path $PSScriptRoot -Parent) "wifi-box-monitor.log"
}
else {
    $LogPath = Join-Path $LogPath (Split-Path (Join-Path $PSScriptRoot "..\wifi-box-monitor.log") -Leaf)
}
$LogFile = Join-Path (Split-Path $PSScriptRoot -Parent) "wifi-box-monitor.log"

function Write-Log([string]$Message) {
    $Message | Tee-Object -FilePath $LogFile -Append
}

Write-Log "=== monitor start $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') checks=$Checks interval=${IntervalSeconds}s ==="

for ($n = 1; $n -le $Checks; $n++) {
    $ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $wifi = (Get-NetAdapter -Name "Wi-Fi" -ErrorAction SilentlyContinue).Status
    $eth = (Get-NetAdapter -Name "Ethernet 3" -ErrorAction SilentlyContinue).Status
    $gwRoute = Get-NetRoute -DestinationPrefix "0.0.0.0/0" -ErrorAction SilentlyContinue |
        Sort-Object RouteMetric | Select-Object -First 1
    $gw = if ($gwRoute) { $gwRoute.InterfaceAlias } else { "NONE" }
    $inet = Test-NetConnection 8.8.8.8 -InformationLevel Quiet -WarningAction SilentlyContinue
    $box = Test-NetConnection 10.0.0.1 -Port 3080 -InformationLevel Quiet -WarningAction SilentlyContinue
    $dns = "FAIL"
    try {
        $dns = (Resolve-DnsName google.com -Type A -ErrorAction Stop | Select-Object -First 1).IPAddress
    }
    catch { }

    Write-Log "$ts | $($n)/$Checks | WiFi=$wifi Eth3=$eth DefaultGW=$gw Internet=$inet Box3080=$box DNS=$dns"

    if ($n -lt $Checks) {
        Start-Sleep -Seconds $IntervalSeconds
    }
}

Write-Log "=== monitor end $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') ==="
