# FIX 1: HoldingsTab.tsx
$path = "C:\Users\Administrator\Desktop\rishi-terminal\components\lab\HoldingsTab.tsx"
$content = [System.IO.File]::ReadAllText($path)
$broken = "      <td style={{ padding: '12px 12px' }}>{"
$fixed = "    <tr key={h.symbol} style={{ borderBottom: '1px solid rgba(30,41,59,0.4)' }}>
      <td style={{ padding: '12px 12px' }}>
        <Link href={``/stock/${h.symbol}``} style={{ color: '#D4AF37', textDecoration: 'none', fontWeight: 800, fontFamily: 'monospace' }}>{"
$content = $content.Replace($broken, $fixed)
$utf8 = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($path, $content, $utf8)
Write-Host "1 FIXED: HoldingsTab" -ForegroundColor Green

# FIX 2: WatchlistTab.tsx
$path = "C:\Users\Administrator\Desktop\rishi-terminal\components\lab\WatchlistTab.tsx"
$content = [System.IO.File]::ReadAllText($path)
$content = $content.Replace("import { useEffect, useMemo, useState } from 'react';", "import { Fragment, useEffect, useMemo, useState } from 'react';")
$content = $content.Replace("              return (
                  <>
                    <tr key={i.symbol}", "              return (
                  <Fragment key={i.symbol}>
                    <tr")
$content = $content.Replace("                  </>
                );
              })}", "                  </Fragment>
                );
              })}")
$utf8 = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($path, $content, $utf8)
Write-Host "2 FIXED: WatchlistTab Fragment" -ForegroundColor Green

# FIX 3: IntelligenceTab.tsx
$path = "C:\Users\Administrator\Desktop\rishi-terminal\components\lab\IntelligenceTab.tsx"
$content = [System.IO.File]::ReadAllText($path)
$old3 = "              {macroRegimeFit.cyclical}%
              <div style={{ fontSize: 10, color: '#64748B', marginTop: 4 }}>
              </div>
            </div>"
$new3 = "              {macroRegimeFit.cyclical}%
              </div>
              <div style={{ fontSize: 10, color: '#64748B', marginTop: 4 }}>
                Energy, Infra, Metals, Auto, Realty, Banking, Capital Goods
              </div>
            </div>"
$content = $content.Replace($old3, $new3)
$utf8 = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($path, $content, $utf8)
Write-Host "3 FIXED: IntelligenceTab cyclical div" -ForegroundColor Green

# FIX 4: CompareTab typo
$path = "C:\Users\Administrator\Desktop\rishi-terminal\components\lab\CompareTab.tsx"
$content = [System.IO.File]::ReadAllText($path)
$content = $content.Replace('e.te nsionSpread', 'e.tensionSpread')
$utf8 = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($path, $content, $utf8)
Write-Host "4 FIXED: CompareTab typo" -ForegroundColor Green

# FIX 5: CompareTab missing </tr>
$path = "C:\Users\Administrator\Desktop\rishi-terminal\components\lab\CompareTab.tsx"
$content = [System.IO.File]::ReadAllText($path)
$content = $content.Replace(
  "{e.category}</td>
                        ))}
                  </table>",
  "{e.category}</td>
                          </tr>
                        ))}
                  </table>"
)
$utf8 = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($path, $content, $utf8)
Write-Host "5 FIXED: CompareTab </tr>" -ForegroundColor Green

# FIX 6: CompareTab duplicate radar label
$path = "C:\Users\Administrator\Desktop\rishi-terminal\components\lab\CompareTab.tsx"
$content = [System.IO.File]::ReadAllText($path)
$content = $content.Replace(
  "<div style={{ fontSize: 10, color: '#64748B', letterSpacing: 1, marginBottom: 16 }}>
          <div style={{ fontSize: 10, color: ```"#64748B```", letterSpacing: 1, marginBottom: 16 }}>📡 RADAR — 6 Pillar Score Table</div>
          </div>",
  "<div style={{ fontSize: 10, color: '#64748B', letterSpacing: 1, marginBottom: 16 }}>📡 RADAR — 6 Pillar Score Table</div>"
)
$utf8 = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($path, $content, $utf8)
Write-Host "6 FIXED: CompareTab radar label" -ForegroundColor Green

# FIX 7: lib/portfolio/index.ts
$path = "C:\Users\Administrator\Desktop\rishi-terminal\lib\portfolio\index.ts"
$content = [System.IO.File]::ReadAllText($path)
$content = $content.Replace(
  "/**
 * Remove custom weight (revert to default)
 */
  const portfolio = loadPortfolio();
  savePortfolio(portfolio);
}", 
  "/**
 * Remove custom weight (revert to default)
 */
export function removeCustomWeight(name: string): void {
  const portfolio = loadPortfolio();
  portfolio.customWeights = portfolio.customWeights.filter(w => w.name !== name);
  savePortfolio(portfolio);
}"
)
$utf8 = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($path, $content, $utf8)
Write-Host "7 FIXED: portfolio/index.ts removeCustomWeight" -ForegroundColor Green

# FIX 8: lib/portfolio.ts
$path = "C:\Users\Administrator\Desktop\rishi-terminal\lib\portfolio.ts"
$content = [System.IO.File]::ReadAllText($path)
$content = $content.Replace(
  "  for (const h of local) {
    await saveHolding(userId, h);

}",
  "  for (const h of local) {
    await saveHolding(userId, h);
  }
  localStorage.removeItem(LS_KEY);
  console.log('[Portfolio] Migrated', local.length, 'holdings to Supabase');
}"
)
$utf8 = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($path, $content, $utf8)
Write-Host "8 FIXED: portfolio.ts migrate" -ForegroundColor Green

# FIX 9: lib/watchlist.ts
$path = "C:\Users\Administrator\Desktop\rishi-terminal\lib\watchlist.ts"
$content = [System.IO.File]::ReadAllText($path)
$content = $content.Replace(
  "  if (error) throw error;
    notes:   r.notes ?? '',
    addedAt: r.added_at,
  }));
}",
  "  if (error) throw error;
  return (data ?? []).map(r => ({
    symbol:  r.symbol,
    notes:   r.notes ?? '',
    addedAt: r.added_at,
  }));
}"
)
$utf8 = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($path, $content, $utf8)
Write-Host "9 FIXED: watchlist.ts .map()" -ForegroundColor Green

# FIX 10: Remove .bak files
Get-ChildItem "C:\Users\Administrator\Desktop\rishi-terminal\components\lab" -Filter "*.bak" | Remove-Item -Force
Write-Host "10 FIXED: Removed .bak files" -ForegroundColor Green

Write-Host "`n=== ALL 10 FIXES APPLIED ===" -ForegroundColor Cyan