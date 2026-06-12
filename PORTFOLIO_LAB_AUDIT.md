# PORTFOLIO LAB AUDIT

Date: 2026-06-11

## COMPONENT SIZE

OverviewTab: 933 lines
IntelligenceTab: 524 lines
CompareTab: 1137 lines
WatchlistTab: 873 lines
PortfolioXRay: 301 lines
HoldingsTab: 283 lines

Total: 4051 lines

## KEEP - Strong Value

OverviewTab:
- Hero Cards (Invested, Current, P&L, Score)
- XIRR / TWRR
- Multi-Timeframe Returns vs Nifty/Sensex
- Rishi Council Verdict
- Risk Summary Gauges (Top5, Liquidity, Cyclical, Overall)
- What-If Simulator
- Rebalance Suggestions

IntelligenceTab:
- Portfolio Bull / Bear
- Conviction Heatmap (Rishi x Holding matrix)
- Knowledge Gaps
- Top Conflict Pairs

CompareTab:
- Multi-Stock Comparison
- Historical Performance Chart

PortfolioXRay:
- Stress Testing (2008/2020/2022 scenarios)
- Sector Allocation

## REMOVE

1. Daily Enlightenment Streak - gamification, no decision value
2. Recovery Elasticity - complex, low comprehension
3. HHI Gauge - redundant with Top 5 Concentration
4. Governance Risk Gauge - misleading heuristic
5. Knowledge Coverage % - unclear action
6. Per-Holding Rishi Verdict in Intelligence - duplicate
7. Philosophy Alignment (all 20 Rishis) - too much data

## SIMPLIFY

IntelligenceTab:
- Show only Top 5 Bulls + Top 5 Bears (not all 20 Rishis)

OverviewTab:
- Merge Best/Worst into hero badges (not full cards)

## ADD - High Value

1. Macro Regime Fit (replace Enlightenment Streak)
   - Pull current regime from Economy Plus
   - Show portfolio sector alignment
   - Compute fit score (0-100)
   - Flag aligned/misaligned sectors

Example:
  Current Regime: Liquidity Tightening
  Portfolio Fit: 68/100
  Aligned: Banking (22%), FMCG (18%)
  Risk: Metals (12%), Small Caps (8%)

2. Scenario Impact (extend PortfolioXRay)
   - Oil +30% → Portfolio -4.2%
   - USDINR +10% → Portfolio impact
   - Fed cuts → sector impacts

## NET RESULT

Before: 8 gauges, 20 Rishi rows, gamification
After: 4 core gauges, Top 5 Bulls/Bears, Macro integration

Impact: ~200 lines removed, clarity increased, moat strengthened
