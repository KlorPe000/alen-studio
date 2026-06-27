
# Targeted download using VERIFIED correct filenames from Wikipedia
$outDir = "D:\projects\deteling-studio3\public\logos"
$ua     = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
$enc8   = New-Object System.Text.UTF8Encoding($false)
$COM    = "https://commons.wikimedia.org/wiki/Special:FilePath"
$ENW    = "https://en.wikipedia.org/wiki/Special:FilePath"
$SIC    = "https://cdn.simpleicons.org"   # monochrome SVG fallback

function Get-SVG($slug, [string[][]]$tries) {
    $path = Join-Path $outDir "$slug.svg"
    if (Test-Path $path) { Write-Host "$slug  SKIP (exists)" -ForegroundColor DarkGray; return $true }
    foreach ($t in $tries) {
        $base = $t[0]; $fn = $t[1]
        try {
            $url = if ($base -eq $SIC) { "$SIC/$fn" } else { "$base/$([Uri]::EscapeDataString($fn))" }
            $r = Invoke-WebRequest -Uri $url -MaximumRedirection 10 -UseBasicParsing `
                     -TimeoutSec 20 -Headers @{"User-Agent"=$ua} -ErrorAction Stop
            if ($r.StatusCode -eq 200 -and ($r.Headers.'Content-Type' -match 'svg' -or $r.Content -match '<svg')) {
                [System.IO.File]::WriteAllText($path, $r.Content, $enc8)
                Write-Host "$slug  OK  [$fn]" -ForegroundColor Green
                return $true
            }
        } catch { }
        Start-Sleep -Milliseconds 700
    }
    return $false
}

$ok = @(); $failed = @()

$brands = @(
  # --- already downloaded in previous run, will SKIP ---
  # acura audi bmw chery dodge dongfeng fiat ford geely genesis honda hyundai
  # infiniti jeep lamborghini lexus mazda mercedes-benz mini mitsubishi nissan
  # suzuki tesla toyota volkswagen

  # --- verified correct filenames ---
  @("byd",          @($COM,"BYD_Auto_2022_logo.svg")),
  @("cadillac",     @($COM,"Cadillac_logo_BW.svg")),
  @("citroen",      @($COM,"Citroën_2021.svg"),@($COM,"Citroen_2021.svg"),@($COM,"Citroen_2022.svg")),
  @("cupra",        @($COM,"Cupra.svg")),
  @("dacia",        @($COM,"Dacia_2021_logo_green.svg"),@($COM,"Dacia_2021_symbol.svg")),
  @("ferrari",      @($COM,"Prancing_horse.svg"),@($COM,"Ferrari_logo_(emblem).svg")),
  @("haval",        @($COM,"Haval_2023_logo.svg"),@($COM,"Haval_logo.svg")),
  @("isuzu",        @($COM,"Isuzu.svg"),@($COM,"Isuzu_logo.svg")),
  @("iveco",        @($COM,"Iveco_Logo_2023.svg"),@($COM,"Iveco_logo.svg")),
  @("jac",          @($COM,"JAC_Motors_logo.svg"),@($COM,"JAC_logo.svg")),
  @("lynk-co",      @($COM,"Lynk_&_Co_2016_logo.svg")),
  @("maserati",     @($COM,"Maserati_logo_2.svg"),@($COM,"Maserati_Script.svg")),
  @("mg",           @($COM,"MG_Motor_2021_logo.svg"),@($COM,"MG_Motor_logo.svg")),
  @("opel",         @($COM,"Opel_logo_2023.svg"),@($COM,"Opel_2021_logo.svg")),
  @("polestar",     @($COM,"Polestar_Logo.svg"),@($COM,"Polestar_symbol.svg")),
  @("renault",      @($COM,"2021_Renault_Group_logo.svg"),@($COM,"Renault_2021_logo.svg")),
  @("rolls-royce",  @($COM,"Rolls_royce_motorcars_logo.svg"),@($COM,"Rolls-Royce_Motor_Cars_logo.svg")),
  @("seat",         @($COM,"SEAT_Logo_from_2017.svg"),@($COM,"Seat_logo_2012.svg")),
  @("smart",        @($COM,"Smart_2022.svg"),@($COM,"Smart_logo_(2019).svg")),
  @("ssangyong",    @($COM,"Ssangyong_company_logo.svg"),@($COM,"SsangYong_Motor_logo.svg")),
  @("subaru",       @($COM,"Subaru_logo_(transparent).svg"),@($COM,"Subaru_logo.svg")),
  @("volvo",        @($COM,"Volvo-Iron-Mark-Black.svg"),@($COM,"Volvo_logo.svg")),
  @("zeekr",        @($COM,"Zeekr_logo.svg")),
  # --- en-wiki (non-free logos used under trademark fair use) ---
  @("bentley",      @($ENW,"Bentley_logo_2.svg")),
  @("chevrolet",    @($ENW,"Chevrolet_(logo).svg"),@($ENW,"Chevrolet_logo.svg")),
  @("jaguar",       @($ENW,"Jaguar_logo_2021.svg"),@($COM,"Jaguar_logo.svg")),
  @("kia",          @($ENW,"KIA_logo3.svg"),@($COM,"KIA_logo3.svg"),@($COM,"Kia_logo2.svg")),
  @("land-rover",   @($ENW,"Land_Rover_logo_black.svg"),@($COM,"LandRover.svg"),@($COM,"Land_Rover_logo.svg")),
  @("peugeot",      @($ENW,"Peugeot_2021_Logo.svg"),@($COM,"Peugeot_2021_logo.svg"),@($COM,"Peugeot_2021_Logo.svg")),
  # --- unknowns: try multiple options then Simple Icons as last resort ---
  @("alfa-romeo",   @($ENW,"Alfa_Romeo_logo.svg"),@($COM,"Alfa_Romeo_logo.svg"),@($SIC,"alfaromeo")),
  @("chrysler",     @($COM,"Chrysler_1998_wordmark.svg"),@($ENW,"Chrysler_logo.svg"),@($COM,"Chrysler_Group_logo.svg")),
  @("daewoo",       @($COM,"Daewoo_Logo.svg"),@($ENW,"Daewoo_logo.svg"),@($COM,"Daewoo_Motors_logo.svg")),
  @("faw",          @($COM,"FAW_logo.svg"),@($ENW,"FAW_logo.svg"),@($COM,"FAW_Group_logo.svg")),
  @("gac",          @($COM,"GAC_Group_logo.svg"),@($ENW,"GAC_Group_Logo.svg"),@($SIC,"gac")),
  @("great-wall",   @($COM,"Great_Wall_Motors_logo.svg"),@($COM,"GWM_logo.svg"),@($ENW,"GWM_logo.svg")),
  @("porsche",      @($ENW,"Porsche_logo.svg"),@($COM,"Porsche_Logo.svg"),@($SIC,"porsche")),
  @("skoda",        @($COM,"Škoda_wordmark.svg"),@($ENW,"Škoda_Auto_logo.svg"),@($COM,"Skoda_wordmark.svg"),@($SIC,"skoda"))
)

foreach ($b in $brands) {
    $slug    = $b[0]
    $sources = $b[1..($b.Length-1)] | ForEach-Object { [string[]]$_ }
    if (Get-SVG $slug $sources) { $ok += $slug } else { Write-Host "$slug  FAILED" -ForegroundColor Red; $failed += $slug }
    Start-Sleep -Milliseconds 800
}

Write-Host "`n=== $($ok.Count) downloaded  /  $($failed.Count) failed ===" -ForegroundColor Cyan
if ($failed) { Write-Host "Still failed: $($failed -join ', ')" -ForegroundColor Yellow }
