# Parse IIS logs for month-wise request counts (last 6 months: March 2026 - August 2026)
# IIS W3C log format: date is first field, lines starting with # are comments

$logRoot = "C:\inetpub\logs\LogFiles"
$startDate = [DateTime]"2026-02-01"
$endDate = [DateTime]"2026-08-25"

# Map W3SVC site IDs to site names
$siteMap = @{
    "W3SVC1"  = "Default Web Site"
    "W3SVC2"  = "LMS (old)"
    "W3SVC3"  = "ERP"
    "W3SVC4"  = "Agile"
    "W3SVC5"  = "timetrack"
    "W3SVC6"  = "Suryamrit"
    "W3SVC7"  = "CYBT"
    "W3SVC8"  = "fasttrack"
    "W3SVC9"  = "BillingApplication"
    "W3SVC10" = "ITSM"
    "W3SVC11" = "dms"
    "W3SVC12" = "BillingAppV2"
    "W3SVC13" = "Hrms"
    "W3SVC14" = "ygt"
    "W3SVC15" = "LMS"
    "W3SVC16" = "CybaemResearch"
    "W3SVC17" = "case"
    "W3SVC18" = "ProjectManagement"
    "W3SVC19" = "EMS Dashboard"
}

$results = @{}

foreach ($dir in Get-ChildItem $logRoot -Directory) {
    $siteName = if ($siteMap.ContainsKey($dir.Name)) { $siteMap[$dir.Name] } else { $dir.Name }
    
    foreach ($file in Get-ChildItem $dir.FullName -Filter "*.log" -File) {
        # IIS log files are named like u_ex260301.log (yymmdd)
        foreach ($line in [System.IO.File]::ReadLines($file.FullName)) {
            if ($line.StartsWith("#")) { continue }
            $parts = $line.Split(" ")
            if ($parts.Count -lt 1) { continue }
            
            try {
                $date = [DateTime]::ParseExact($parts[0], "yyyy-MM-dd", $null)
                if ($date -ge $startDate -and $date -le $endDate) {
                    $monthKey = $date.ToString("yyyy-MM")
                    $key = "$siteName|$monthKey"
                    if ($results.ContainsKey($key)) {
                        $results[$key]++
                    } else {
                        $results[$key] = 1
                    }
                }
            } catch {
                continue
            }
        }
    }
}

# Output as CSV
Write-Host "Site,Month,RequestCount"
$results.GetEnumerator() | Sort-Object Name | ForEach-Object {
    $parts = $_.Key.Split("|")
    Write-Host "$($parts[0]),$($parts[1]),$($_.Value)"
}
