$logRoot = "C:\inetpub\logs\LogFiles"
$dirs = Get-ChildItem $logRoot -Directory -ErrorAction SilentlyContinue

foreach ($d in $dirs) {
    $files = Get-ChildItem $d.FullName -File -ErrorAction SilentlyContinue
    $oldest = ($files | Sort-Object LastWriteTime | Select-Object -First 1).LastWriteTime
    $newest = ($files | Sort-Object LastWriteTime -Descending | Select-Object -First 1).LastWriteTime
    $sizeMB = [math]::Round(($files | Measure-Object -Property Length -Sum).Sum / 1MB, 2)
    Write-Host "$($d.Name) | Files: $($files.Count) | Oldest: $oldest | Newest: $newest | Size: ${sizeMB}MB"
}
