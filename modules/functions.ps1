function goto($path) { Set-Location $path }
function ll { Get-ChildItem -Force | Format-Table Mode, LastWriteTime, Length, Name -AutoSize }
function Reload-Terminal { . "C:\Users\Administrator\Desktop\rishi-terminal\autoload.ps1" }
function Write-Log($message, $level = "INFO") {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logFile = "$env:RISHI_LOGS\terminal-$(Get-Date -Format 'yyyy-MM-dd').log"
    Add-Content -Path $logFile -Value "[$timestamp] [$level] $message"
}
function sys-clean {
    Write-Host "[CLEANING] Emptying Windows Temp Folders..." -ForegroundColor Yellow
    Remove-Item -Path "$env:TEMP\*" -Recurse -Force -ErrorAction SilentlyContinue
    Remove-Item -Path "C:\Windows\Temp\*" -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "[DONE] Junk files cleared!" -ForegroundColor Green
}
function zip($folder, $zipName) {
    Compress-Archive -Path $folder -DestinationPath "$zipName.zip" -Force
    Write-Host "[ZIPPED] Created $zipName.zip" -ForegroundColor Green
}
function unzip($zipFile, $dest=".") {
    Expand-Archive -Path $zipFile -DestinationPath $dest -Force
    Write-Host "[UNZIPPED] Extracted to $dest" -ForegroundColor Green
}
function gen-pass($length = 16) {
    $chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
    $pass = (-join ((1..$length) | ForEach-Object { $chars[(Get-Random -Maximum $chars.Length)] }))
    Write-Host "`n[NEW PASSWORD] " -NoNewline -ForegroundColor Cyan
    Write-Host $pass -ForegroundColor White
    $pass | Set-Clipboard
    Write-Host "(Copied to clipboard!)`n" -ForegroundColor DarkGray
}

# Live Price Checker
function Get-Price($symbol, $type = "crypto") {
    try {
        switch ($type) {
            "crypto" {
                $api = "https://api.coingecko.com/api/v3/simple/price?ids=$symbol&vs_currencies=usd"
                $data = Invoke-RestMethod -Uri $api
                $price = $data.$symbol.usd
                Write-Host "`n[CRYPTO] " -NoNewline -ForegroundColor Cyan
                Write-Host "$symbol".ToUpper() -NoNewline -ForegroundColor Yellow
                Write-Host " = `$$price USD`n" -ForegroundColor Green
            }
            "stock" {
                $api = "https://query1.finance.yahoo.com/v8/finance/chart/$symbol"
                $data = Invoke-RestMethod -Uri $api
                $price = $data.chart.result[0].meta.regularMarketPrice
                Write-Host "`n[STOCK] " -NoNewline -ForegroundColor Cyan
                Write-Host "$symbol".ToUpper() -NoNewline -ForegroundColor Yellow
                Write-Host " = `$$price USD`n" -ForegroundColor Green
            }
            "forex" {
                $api = "https://api.exchangerate-api.com/v4/latest/$symbol"
                $data = Invoke-RestMethod -Uri $api
                Write-Host "`n[FOREX] Base: $symbol`n" -ForegroundColor Cyan
                $data.rates.PSObject.Properties | Select-Object -First 10 | ForEach-Object {
                    Write-Host "  $($_.Name) = $($_.Value)" -ForegroundColor White
                }
                Write-Host ""
            }
        }
    } catch {
        Write-Host "`n[ERROR] Could not fetch price for $symbol ($type)`n" -ForegroundColor Red
    }
}

# Quick aliases for common assets
function btc { Get-Price "bitcoin" "crypto" }
function eth { Get-Price "ethereum" "crypto" }
function doge { Get-Price "dogecoin" "crypto" }
function tsla { Get-Price "TSLA" "stock" }
function aapl { Get-Price "AAPL" "stock" }
function gold {
    $api = "https://api.metals.live/v1/spot/gold"
    $data = Invoke-RestMethod -Uri $api
    Write-Host "`n[GOLD] `$$($data[0].price) USD/oz`n" -ForegroundColor Yellow
}

# Live Price Checker
function Get-Price($symbol, $type = "crypto") {
    try {
        switch ($type) {
            "crypto" {
                $api = "https://api.coingecko.com/api/v3/simple/price?ids=$symbol&vs_currencies=usd"
                $data = Invoke-RestMethod -Uri $api
                $price = $data.$symbol.usd
                Write-Host "`n[CRYPTO] " -NoNewline -ForegroundColor Cyan
                Write-Host "$symbol".ToUpper() -NoNewline -ForegroundColor Yellow
                Write-Host " = `$$price USD`n" -ForegroundColor Green
            }
            "stock" {
                $api = "https://query1.finance.yahoo.com/v8/finance/chart/$symbol"
                $data = Invoke-RestMethod -Uri $api
                $price = $data.chart.result[0].meta.regularMarketPrice
                Write-Host "`n[STOCK] " -NoNewline -ForegroundColor Cyan
                Write-Host "$symbol".ToUpper() -NoNewline -ForegroundColor Yellow
                Write-Host " = `$$price USD`n" -ForegroundColor Green
            }
            "forex" {
                $api = "https://api.exchangerate-api.com/v4/latest/$symbol"
                $data = Invoke-RestMethod -Uri $api
                Write-Host "`n[FOREX] Base: $symbol`n" -ForegroundColor Cyan
                $data.rates.PSObject.Properties | Select-Object -First 10 | ForEach-Object {
                    Write-Host "  $($_.Name) = $($_.Value)" -ForegroundColor White
                }
                Write-Host ""
            }
        }
    } catch {
        Write-Host "`n[ERROR] Could not fetch price for $symbol ($type)`n" -ForegroundColor Red
    }
}

# Quick aliases for common assets
function btc { Get-Price "bitcoin" "crypto" }
function eth { Get-Price "ethereum" "crypto" }
function doge { Get-Price "dogecoin" "crypto" }
function tsla { Get-Price "TSLA" "stock" }
function aapl { Get-Price "AAPL" "stock" }
function gold {
    $api = "https://api.metals.live/v1/spot/gold"
    $data = Invoke-RestMethod -Uri $api
    Write-Host "`n[GOLD] `$$($data[0].price) USD/oz`n" -ForegroundColor Yellow
}

# 1. Check if localhost website is running
function web-status ($port = 3000) {
    $url = "http://localhost:$port"
    try {
        $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 3
        Write-Host "`n[ONLINE] Website is running on $url (Status: $($response.StatusCode))`n" -ForegroundColor Green
    } catch {
        Write-Host "`n[OFFLINE] Nothing is responding on $url. Is your dev server running?`n" -ForegroundColor Red
    }
}

# 2. Scan localhost website to see if prices are loading
function web-check-prices ($port = 3000) {
    $url = "http://localhost:$port"
    try {
        $html = (Invoke-WebRequest -Uri $url -UseBasicParsing).Content
        Write-Host "`n[SCANNING HTML] $url ...`n" -ForegroundColor Cyan

        # Check if crypto words or dollar signs exist in your website's code
        $keywords = @("BTC", "ETH", "Bitcoin", "Ethereum", "$", "price")
        
        foreach ($word in $keywords) {
            if ($html -match [regex]::Escape($word)) {
                Write-Host "  [FOUND] -> $word is rendering on your site!" -ForegroundColor Green
            } else {
                Write-Host "  [MISSING] -> $word was not found in the HTML." -ForegroundColor DarkGray
            }
        }
        Write-Host ""
    } catch {
        Write-Host "`n[ERROR] Could not connect. Make sure localhost:$port is running.`n" -ForegroundColor Red
    }
}

# 3. Quick alias to open your site
function web-open ($port = 3000) {
    Start-Process "http://localhost:$port"
    Write-Host "[OPENED] http://localhost:$port in your browser." -ForegroundColor Green
}
