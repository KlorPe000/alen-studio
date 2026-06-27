
# Round 4 — WorldVectorLogo CDN + SimpleIcons for Wikimedia-rate-limited brands
$out  = "D:\projects\deteling-studio3\public\logos"
$ua   = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
$enc8 = New-Object System.Text.UTF8Encoding($false)
$WVL  = "https://cdn.worldvectorlogo.com/logos"
$SIC  = "https://cdn.simpleicons.org"
$C    = "https://commons.wikimedia.org/wiki/Special:FilePath"
$E    = "https://en.wikipedia.org/wiki/Special:FilePath"

# Each row: "slug|base|filename"  base = WVL, SIC, C, or E
$rows = @(
  # --- WorldVectorLogo colored SVGs ---
  "cadillac|WVL|cadillac",
  "dacia|WVL|dacia",
  "dacia|WVL|dacia-3",
  "ferrari|WVL|ferrari",
  "iveco|WVL|iveco",
  "jac|WVL|jac",
  "maserati|WVL|maserati",
  "mg|WVL|mg-motor",
  "mg|WVL|mg",
  "smart|WVL|smart",
  "ssangyong|WVL|ssangyong",
  "zeekr|WVL|zeekr",
  "bentley|WVL|bentley",
  "chevrolet|WVL|chevrolet",
  "chevrolet|WVL|chevrolet-1",
  "jaguar|WVL|jaguar",
  "kia|WVL|kia",
  "kia|WVL|kia-1",
  "land-rover|WVL|land-rover",
  "peugeot|WVL|peugeot",
  "chrysler|WVL|chrysler",
  "daewoo|WVL|daewoo",
  "faw|WVL|faw",
  "great-wall|WVL|great-wall-motors",
  "great-wall|WVL|gwm",
  # --- SimpleIcons monochrome fallback (CC0) ---
  "ferrari|SIC|ferrari",
  "bentley|SIC|bentley",
  "cadillac|SIC|cadillac",
  "chevrolet|SIC|chevrolet",
  "jaguar|SIC|jaguar",
  "kia|SIC|kia",
  "land-rover|SIC|landrover",
  "peugeot|SIC|peugeot",
  "chrysler|SIC|chrysler",
  "maserati|SIC|maserati",
  "smart|SIC|smart",
  "dacia|SIC|dacia",
  "ssangyong|SIC|ssangyong",
  "iveco|SIC|iveco",
  "mg|SIC|mg",
  "zeekr|SIC|zeekr",
  # --- Retry Wikimedia with longer delay ---
  "ferrari|C|Ferrari_logo.svg",
  "ferrari|C|Ferrari-Logo.svg",
  "maserati|C|Maserati_logo_2.svg",
  "dacia|C|Dacia_2021_logo_green.svg",
  "bentley|E|Bentley_logo_2.svg",
  "kia|E|KIA_logo3.svg",
  "jaguar|E|Jaguar_logo_2021.svg",
  "chevrolet|E|Chevrolet_(logo).svg",
  "smart|C|Smart_2022.svg",
  "cadillac|C|Cadillac_logo_BW.svg",
  "land-rover|E|Land_Rover_logo_black.svg",
  "peugeot|E|Peugeot_2021_Logo.svg",
  "iveco|C|Iveco_Logo_2023.svg",
  "jac|C|JAC_Motors_logo.svg",
  "mg|C|MG_Motor_2021_logo.svg",
  "ssangyong|C|Ssangyong_company_logo.svg",
  "zeekr|C|Zeekr_logo.svg",
  "daewoo|C|Daewoo_Logo.svg",
  "faw|C|FAW_logo.svg",
  "great-wall|C|Great_Wall_Motors_logo.svg",
  "chrysler|C|Chrysler_1998_wordmark.svg"
)

$done = @{}
# Mark existing files
Get-ChildItem $out -Filter "*.svg" | ForEach-Object { $done[$_.BaseName] = "pre" }

foreach ($row in $rows) {
    $parts = $row -split '\|', 3
    [string]$slug = $parts[0]; [string]$key = $parts[1]; [string]$fn = $parts[2]
    if ($done[$slug]) { continue }

    $outPath = Join-Path $out "$slug.svg"
    $url = switch($key) {
        "WVL" { "$WVL/$fn.svg" }
        "SIC" { "$SIC/$fn" }
        "C"   { "$C/$([Uri]::EscapeDataString($fn))" }
        "E"   { "$E/$([Uri]::EscapeDataString($fn))" }
    }
    try {
        $r = Invoke-WebRequest -Uri $url -MaximumRedirection 10 -UseBasicParsing `
                 -TimeoutSec 20 -Headers @{"User-Agent"=$ua} -ErrorAction Stop
        $ct = [string]($r.Headers.'Content-Type')
        if ($r.StatusCode -eq 200 -and ($ct -match 'svg' -or $r.Content -match '<svg')) {
            [System.IO.File]::WriteAllText($outPath, $r.Content, $enc8)
            $done[$slug] = $fn
            Write-Host "$slug  OK  [${key}: $fn]" -ForegroundColor Green
        }
    } catch { }
    Start-Sleep -Milliseconds 800
}

$allSlugs = $rows | ForEach-Object { ($_ -split '\|',3)[0] } | Select-Object -Unique
$failed   = $allSlugs | Where-Object { -not $done[$_] }
Write-Host "`n=== $($done.Count) total in folder  /  $($failed.Count) still missing ===" -ForegroundColor Cyan
if ($failed) { Write-Host "Missing: $($failed -join ', ')" -ForegroundColor Yellow }
