
# Downloads official SVG car brand logos from Wikimedia Commons via Special:FilePath redirect.
# Adds a delay between requests to respect rate limits.
$outDir = "D:\projects\deteling-studio3\public\logos"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$ua = "LogoFetcher/1.0 (car-detailing-site; educational)"

function Save-SVG($slug, [string[]]$filenames) {
    foreach ($fn in $filenames) {
        try {
            $enc = [Uri]::EscapeDataString($fn)
            $url = "https://commons.wikimedia.org/wiki/Special:FilePath/$enc"
            $r   = Invoke-WebRequest -Uri $url -MaximumRedirection 10 -UseBasicParsing `
                       -TimeoutSec 20 -Headers @{"User-Agent"=$ua} -ErrorAction Stop
            $ct  = $r.Headers.'Content-Type'
            if ($r.StatusCode -eq 200 -and ($ct -match 'svg' -or $r.Content -match '<svg')) {
                $path = Join-Path $outDir "$slug.svg"
                # WriteAllText with explicit UTF-8 (no BOM)
                $enc8 = New-Object System.Text.UTF8Encoding($false)
                [System.IO.File]::WriteAllText($path, $r.Content, $enc8)
                return $fn
            }
        } catch { }
        Start-Sleep -Milliseconds 800
    }
    return $null
}

$brands = @(
  @("acura",         "Acura_wordmark.svg","Acura_logo.svg","Acura_logo_(2014).svg"),
  @("alfa-romeo",    "Alfa_Romeo_Romeo.svg","Alfa_Romeo_logo.svg","Logo_Alfa_Romeo.svg"),
  @("audi",          "Audi-Logo_2016.svg","Audi_Logo.svg","Audi_logo.svg"),
  @("bentley",       "Bentley_Motors_logo.svg","Bentley_logo.svg","Bentley_Logo.svg"),
  @("bmw",           "BMW.svg","BMW_Logo.svg","BMW_logo.svg"),
  @("byd",           "BYD_Company_Logo_2023.svg","BYD_Auto_logo.svg","BYD_logo.svg"),
  @("cadillac",      "Cadillac_logo.svg","Cadillac_Motor_Cars_Division.svg"),
  @("chery",         "Chery_logo.svg","Chery_Automobile_logo.svg","Chery_logo_2.svg"),
  @("chevrolet",     "Chevrolet_logo.svg","Chevrolet_bowtie.svg","Chevrolet_Logo.svg"),
  @("chrysler",      "Chrysler_logo.svg","Chrysler_2011_logo.svg","Chrysler_Logo.svg"),
  @("citroen",       "Citroen_2009_logo.svg","Citroën_2022_logo.svg","Citroën_logo.svg","Citroen_logo.svg"),
  @("cupra",         "CUPRA_logo.svg","Cupra_logo.svg","CUPRA_wordmark.svg"),
  @("dacia",         "Dacia_2021_logo.svg","Dacia_logo.svg"),
  @("daewoo",        "Daewoo_Logo.svg","Daewoo_logo.svg","Daewoo_Motors_logo.svg"),
  @("dodge",         "Dodge_logo.svg","Dodge_2011_logo.svg","Dodge_logo_2014.svg"),
  @("dongfeng",      "Dongfeng_logo.svg","Dongfeng_Motor_logo.svg","Dongfeng_Motor_Corporation_logo.svg"),
  @("faw",           "FAW_logo.svg","FAW_Group_logo.svg","First_Auto_Works_logo.svg"),
  @("ferrari",       "Ferrari-Logo.svg","Ferrari_logo.svg","Ferrari_Logo.svg"),
  @("fiat",          "Fiat_logo_2020.svg","Fiat_logo.svg","FIAT_logo.svg"),
  @("ford",          "Ford_logo_flat.svg","Ford_Motor_Company_Logo.svg","Ford_logo.svg"),
  @("gac",           "GAC_Group_logo.svg","GAC_logo.svg","GAC_Motor_logo.svg","Guangzhou_Automobile_Group_logo.svg"),
  @("geely",         "Geely_logo_2014.svg","Geely_logo.svg","Geely_Logo.svg"),
  @("genesis",       "Genesis_Motor_logo.svg","Genesis_logo.svg","Genesis_(automobile)_logo.svg"),
  @("great-wall",    "Great_Wall_Motors_Logo.svg","GWM_logo.svg","Great_Wall_Motors_logo.svg"),
  @("haval",         "Haval_logo.svg","HAVAL_logo.svg"),
  @("honda",         "Honda_Logo.svg","Honda_logo.svg"),
  @("hyundai",       "Hyundai_Motor_Company_logo.svg","Hyundai_logo.svg"),
  @("infiniti",      "Infiniti_logo.svg","Infiniti_G37_Logo.svg","Infiniti_Logo.svg"),
  @("isuzu",         "Isuzu_logo.svg","Isuzu_motors_logo.svg","Isuzu_Logo.svg"),
  @("iveco",         "Iveco_logo.svg","Iveco_Logo.svg"),
  @("jac",           "JAC_logo.svg","JAC_Motors_logo.svg","JAC_Group_logo.svg"),
  @("jaguar",        "Jaguar_logo.svg","Jaguar_Cars_logo.svg","Jaguar_Logo.svg"),
  @("jeep",          "Jeep_wordmark.svg","Jeep_logo.svg","Jeep_Logo.svg"),
  @("kia",           "Kia_logo2.svg","Kia-logo2.svg","Kia_logo.svg"),
  @("lamborghini",   "Lamborghini_Logo.svg","Lamborghini_logo.svg"),
  @("land-rover",    "Land_Rover_logo.svg","Land_Rover_Logo.svg"),
  @("lexus",         "Lexus_-_Logo.svg","Lexus_logo.svg","Lexus_Logo.svg"),
  @("lynk-co",       "Lynk_&_Co_logo.svg","Lynkco_logo.svg","Lynk_and_Co_logo.svg"),
  @("maserati",      "Maserati_Script.svg","Maserati_logo.svg","Maserati_Logo.svg"),
  @("mazda",         "Mazda_logo.svg","Mazda_Logo.svg"),
  @("mercedes-benz", "Mercedes-Benz_Logo_2010.svg","Mercedes_logo.svg","Mercedes-Benz_logo.svg"),
  @("mg",            "MG_Motor_logo.svg","MG_logo.svg","MG_Motors_logo.svg","MG_Cars_logo.svg"),
  @("mini",          "Mini_logo.svg","MINI_logo.svg","Mini_Cooper_logo.svg"),
  @("mitsubishi",    "Mitsubishi_logo.svg","Mitsubishi_Motors_logo.svg"),
  @("nissan",        "Nissan_2020_logo.svg","Nissan_logo.svg","Nissan_Logo.svg"),
  @("opel",          "Opel_2021_logo.svg","Opel_logo.svg"),
  @("peugeot",       "Peugeot_2021_logo.svg","Peugeot_logo.svg","Peugeot_Logo.svg"),
  @("polestar",      "Polestar_symbol.svg","Polestar_logo.svg","Polestar_Automotive_logo.svg"),
  @("porsche",       "Porsche_Logo.svg","Porsche_logo.svg"),
  @("renault",       "Renault_2021_logo.svg","Renault_logo.svg","Renault_Logo.svg"),
  @("rolls-royce",   "Rolls_Royce_Motor_Cars_Logo.svg","Rolls-Royce_logo.svg","Rolls_Royce_logo.svg"),
  @("seat",          "Seat_logo_2012.svg","SEAT_2012_logo.svg","SEAT_logo.svg"),
  @("smart",         "Smart_logo_(2019).svg","Smart_logo.svg","Smart_Automobile_logo.svg"),
  @("ssangyong",     "SsangYong_Motor_logo.svg","Ssangyong_logo.svg","SsangYong_logo.svg"),
  @("skoda",         "Škoda_wordmark.svg","Skoda_wordmark.svg","Skoda_Auto_logo.svg","Škoda_Auto_logo.svg","Skoda_logo.svg"),
  @("subaru",        "Subaru_logo.svg","Subaru_Logo.svg"),
  @("suzuki",        "Suzuki_logo_2.svg","Suzuki_logo.svg","Suzuki_Logo.svg"),
  @("tesla",         "Tesla_Motors.svg","Tesla_logo.svg","Tesla_Logo.svg"),
  @("toyota",        "Toyota.svg","Toyota_logo.svg","Toyota_Logo.svg"),
  @("volkswagen",    "Volkswagen_logo_2019.svg","Volkswagen_logo.svg"),
  @("volvo",         "Volvo_logo.svg","Volvo_Cars_logo.svg","Volvo_Logo.svg"),
  @("zeekr",         "ZEEKR_logo.svg","Zeekr_logo.svg","Zeekr_Electric_logo.svg")
)

$ok = @(); $failed = @()
foreach ($b in $brands) {
    $slug  = $b[0]
    $files = $b[1..($b.Length-1)]
    Write-Host -NoNewline "$slug ... "
    $result = Save-SVG $slug $files
    if ($result) {
        Write-Host "OK [$result]" -ForegroundColor Green
        $ok += $slug
    } else {
        Write-Host "FAILED" -ForegroundColor Red
        $failed += $slug
    }
    Start-Sleep -Milliseconds 1200
}

Write-Host ""
Write-Host "=== $($ok.Count) ok  /  $($failed.Count) failed ===" -ForegroundColor Cyan
if ($failed.Count -gt 0) { Write-Host "Failed: $($failed -join ', ')" -ForegroundColor Yellow }
