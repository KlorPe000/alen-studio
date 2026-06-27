
# Flat-entry download script — avoids PS5.1 nested array pitfalls
$out  = "D:\projects\deteling-studio3\public\logos"
$ua   = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
$enc8 = New-Object System.Text.UTF8Encoding($false)
$C    = "https://commons.wikimedia.org/wiki/Special:FilePath"
$E    = "https://en.wikipedia.org/wiki/Special:FilePath"
$S    = "https://cdn.simpleicons.org"   # monochrome CC0 fallback

# Each row: "slug|baseKey|filename"  (baseKey = C, E, or S)
# Listed in priority order; first row that works wins for that slug.
$rows = @(
  "byd|C|BYD_Auto_2022_logo.svg",
  "cadillac|C|Cadillac_logo_BW.svg",
  "citroen|C|Citroën_2021.svg",
  "citroen|C|Citroen_2021.svg",
  "citroen|C|Citroen_2022.svg",
  "cupra|C|Cupra.svg",
  "dacia|C|Dacia_2021_logo_green.svg",
  "dacia|C|Dacia_2021_symbol.svg",
  "ferrari|C|Prancing_horse.svg",
  "haval|C|Haval_2023_logo.svg",
  "haval|C|Haval_logo.svg",
  "isuzu|C|Isuzu.svg",
  "iveco|C|Iveco_Logo_2023.svg",
  "iveco|C|Iveco_logo.svg",
  "jac|C|JAC_Motors_logo.svg",
  "jac|C|JAC_logo.svg",
  "lynk-co|C|Lynk_&_Co_2016_logo.svg",
  "maserati|C|Maserati_logo_2.svg",
  "mg|C|MG_Motor_2021_logo.svg",
  "mg|C|MG_Motor_logo.svg",
  "opel|C|Opel_logo_2023.svg",
  "polestar|C|Polestar_Logo.svg",
  "renault|C|2021_Renault_Group_logo.svg",
  "rolls-royce|C|Rolls_royce_motorcars_logo.svg",
  "rolls-royce|C|Rolls-Royce_Motor_Cars_logo.svg",
  "seat|C|SEAT_Logo_from_2017.svg",
  "smart|C|Smart_2022.svg",
  "smart|C|Smart_logo_(2019).svg",
  "ssangyong|C|Ssangyong_company_logo.svg",
  "subaru|C|Subaru_logo_(transparent).svg",
  "volvo|C|Volvo-Iron-Mark-Black.svg",
  "zeekr|C|Zeekr_logo.svg",
  "bentley|E|Bentley_logo_2.svg",
  "chevrolet|E|Chevrolet_(logo).svg",
  "chevrolet|C|Chevrolet_logo.svg",
  "jaguar|E|Jaguar_logo_2021.svg",
  "jaguar|C|Jaguar_logo.svg",
  "kia|E|KIA_logo3.svg",
  "kia|C|KIA_logo3.svg",
  "land-rover|E|Land_Rover_logo_black.svg",
  "land-rover|C|LandRover.svg",
  "peugeot|E|Peugeot_2021_Logo.svg",
  "peugeot|C|Peugeot_2021_logo.svg",
  "alfa-romeo|E|Alfa_Romeo_logo.svg",
  "alfa-romeo|C|Alfa_Romeo_logo.svg",
  "alfa-romeo|S|alfaromeo",
  "chrysler|C|Chrysler_1998_wordmark.svg",
  "chrysler|E|Chrysler_logo.svg",
  "chrysler|C|Chrysler_Group_logo.svg",
  "daewoo|C|Daewoo_Logo.svg",
  "daewoo|E|Daewoo_logo.svg",
  "faw|C|FAW_logo.svg",
  "faw|E|FAW_logo.svg",
  "gac|C|GAC_Group_logo.svg",
  "gac|E|GAC_logo.svg",
  "gac|S|gac",
  "great-wall|C|Great_Wall_Motors_logo.svg",
  "great-wall|C|GWM_logo.svg",
  "great-wall|E|GWM_logo.svg",
  "porsche|E|Porsche_logo.svg",
  "porsche|C|Porsche_Logo.svg",
  "porsche|S|porsche",
  "skoda|C|Škoda_wordmark.svg",
  "skoda|E|Škoda_Auto_logo.svg",
  "skoda|C|Skoda_wordmark.svg",
  "skoda|S|skodaauto"
)

$done = @{}
foreach ($row in $rows) {
    $parts = $row -split '\|', 3
    [string]$slug = $parts[0]; [string]$key = $parts[1]; [string]$fn = $parts[2]
    if ($done[$slug]) { continue }           # already succeeded for this slug
    $outPath = Join-Path $out "$slug.svg"
    if (Test-Path $outPath) { $done[$slug] = "exists"; continue }

    $base = switch($key){ "C"{$C} "E"{$E} "S"{$S} default{$C} }
    $url  = if ($key -eq "S") { "$S/$fn" } else { "$base/$([Uri]::EscapeDataString($fn))" }

    try {
        $r = Invoke-WebRequest -Uri $url -MaximumRedirection 10 -UseBasicParsing `
                 -TimeoutSec 20 -Headers @{"User-Agent"=$ua} -ErrorAction Stop
        $ct = [string]($r.Headers.'Content-Type')
        if ($r.StatusCode -eq 200 -and ($ct -match 'svg' -or $r.Content -match '<svg')) {
            [System.IO.File]::WriteAllText($outPath, $r.Content, $enc8)
            $done[$slug] = $fn
            Write-Host "$slug  OK  [$fn]" -ForegroundColor Green
        }
    } catch { }
    Start-Sleep -Milliseconds 600
}

# Summary
$succeeded = $done.Keys | Where-Object { $done[$_] -ne $null }
$failed    = $rows | ForEach-Object { ($_ -split '\|',3)[0] } | Select-Object -Unique |
             Where-Object { -not $done[$_] }
Write-Host "`n=== $($succeeded.Count) OK  /  $($failed.Count) failed ===" -ForegroundColor Cyan
if ($failed) { Write-Host "Failed: $($failed -join ', ')" -ForegroundColor Yellow }
