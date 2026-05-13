# Technical Indicators Integration Guide

**Created:** 2026-05-12 16:52  
**Purpose:** Add unified technical indicators and price charts to all asset pages

---

## ✅ What Was Created

### 1. TechnicalIndicatorsPanel Component
**Location:** `components/shared/TechnicalIndicatorsPanel.tsx`

**Features:**
- RSI (Relative Strength Index)
- MACD (Moving Average Convergence Divergence)
- Bollinger Bands
- ADX (Average Directional Index)
- Supertrend indicator
- Overall technical bias

**Props Interface:**
- assetType: 'stock' | 'crypto' | 'forex' | 'commodity' | 'bond'
- symbol: string
- currentPrice: number
- data: optional metrics object

### 2. PriceChartPanel Component
**Location:** `components/shared/PriceChartPanel.tsx`

**Features:**
- Price chart with timeframe selector (1D, 1W, 1M, 3M, 1Y)
- Color-coded price movement (green/red)
- Responsive bar chart visualization
- Currency formatting based on asset type

---

## 🔧 Integration Steps

### Crypto Page Integration
Add to individual crypto detail pages:
- Import both components
- Pass crypto.price as currentPrice
- Include volatility and volume24h in data prop

### Forex Page Integration
Add to individual forex pair pages:
- Pass pair.spotRate as currentPrice
- Include pair.volatility in data prop
- Use 4 decimal places for forex formatting

### Commodities Page Integration
Add to individual commodity pages:
- Pass commodity.price as currentPrice
- Include volatility data if available
- Display in USD

### Bonds Page Integration
Add to individual bond pages:
- Pass bond.ytm as currentPrice
- Consider yield-specific analysis instead of standard technicals

---

## 📝 Next Steps

### Immediate
1. ✅ Create shared components (DONE)
2. ⬜ Create individual asset detail pages
3. ⬜ Add components to each detail page

### Short-term
4. ⬜ Replace mock data with real API calls
5. ⬜ Add historical price data fetching
6. ⬜ Implement candlestick charts
7. ⬜ Add volume bars to price charts

### Medium-term
8. ⬜ Add more indicators (Stochastic, CCI, Williams %R)
9. ⬜ Allow users to customize indicator settings
10. ⬜ Export chart images
11. ⬜ Add drawing tools

---

## 🎨 Design Notes

- **Sacred Dark Theme:** Uses var(--accent-gold), var(--accent-green), var(--accent-red)
- **Typography:** Cinzel for headings, JetBrains Mono for numbers
- **Animations:** Smooth transitions on all interactive elements
- **Responsive:** Components use CSS Grid with auto-fit
- **Accessibility:** Proper color contrast, keyboard navigation

---

## 🐛 Known Limitations

1. **Mock Historical Data:** Charts use fixed bar heights
   - Solution: Integrate with Yahoo Finance or CoinGecko APIs
2. **Static Indicators:** Calculations use simplified formulas
   - Solution: Use real OHLC data for accurate RSI/MACD
3. **No Real-time Updates:** Prices don't auto-refresh
   - Solution: Add WebSocket or polling for live updates

---

**End of Guide**