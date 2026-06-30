# Monitor Wi-Fi internet + CurXor box while COMMAND cable is plugged in.
# Run: powershell -ExecutionPolicy Bypass -File .\scripts\monitor-laptop-connectivity.ps1
param(
    [int] $Checks = 20,
    [int] $IntervalSeconds = 90
)

$log = Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) "..\wifi-box-monitor.log"
$log = [System.IO.Path]::GetFullPath($log)

"=== monitor start $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') ===" | Out-File $log -Encoding utf8

1..$Checks | ForEach-Object {
    $n = $_
    $ts = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    $wifi = (Get-NetAdapter -Name 'Wi-Fi' -ErrorAction SilentlyContinue).Status
    $eth = (Get-NetAdapter -Name 'Ethernet 3' -ErrorAction SilentlyContinue).Status
    $gw = (Get-NetRoute -DestinationPrefix '0.0.0.0/0' -ErrorAction SilentlyContinue |
        Sort-Object RouteMetric | Select-Object -First 1).InterfaceAlias
    $inet = Test-NetConnection 8.8.8.8 -InformationLevel Quiet -WarningAction SilentlyContinue
    $box = Test-NetConnection 10.0.0.1 -Port 3080 -InformationLevel Quiet -WarningAction SilentlyContinue
    $dns = try {
        (Resolve-DnsName google.com -Type A -ErrorAction Stop | Select-Object -First 1).IPAddress
    }
    catch {
        'FAIL'
    }
    $line = "$ts | $n/$Checks | WiFi=$wifi Eth3=$eth DefaultGW=$gw Internet=$inet Box3080=$box DNS=$dns"
    Write-Host $line
    $line | Out-File $log -Append -Encoding utf8
    if ($n -lt $Checks) {
        Start-Sleep -Seconds $IntervalSeconds
    }
}

"=== monitor end $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') ===" | Out-File $log -Append -Encoding utf8
