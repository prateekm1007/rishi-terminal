## toFixed inventory (P0-06) — remaining 245 call sites, by group

`git grep -nE "toFixed\(" -- app components | grep -v DataValue | wc -l` → 245.
The seed-derived DOM renders were migrated to `<DataValue>` in N7 (screener
PE/ROE/score cells, chat info bar, consensus spread, dashboard stat cards).
Every remaining call site belongs to one of the justified groups below;
re-classify a group by migrating it, never by deleting the justification.

| Group | ~Count | Justification |
|---|---|---|
| Chart geometry & axes (SVG/canvas: PriceChart, AssetPriceChart, PayoffChart, QuarterlyChart, ShareholdingChart, PriceChartPanel, TechnicalIndicatorsPanel, TechnicalIndicators, WorldMarketsGrid) | 73 | Axis ticks, gridlines and path math live inside SVG/canvas drawing code — a React tooltip component cannot be rendered there. All series plotted are live price/history feeds (T14: seed prices are never charted as current). |
| Live-quote surfaces (forex/commodity/crypto/bond clients, pulse, news, LivePriceWidget, alerts) | ~120 | Format LIVE feed values (prices, changes, volumes) or user-entered alert thresholds — never seed data; T14 and the live-price failure tests govern them. DataValue migration is cosmetic here (source is always the live feed) and is deferred until the founder confirms the P0-06 strict contract for live surfaces. |
| Derived math on live/user inputs (lab P&L, XIRR, beta, what-if share counts, formatCurrency helpers) | ~35 | Percentages and money computed from live quotes and user-entered positions inside helper functions that return strings for tight table cells; inputs are live/derived, not seed. |
| Server-side response formatting (app/api/pulse/*, admin providers) | 5 | Numeric formatting of API JSON payloads — not UI rendering; the consumers render them through their own surfaces. |
| Non-market numbers (conviction sliders, progress widths, RishiScoreDual gauge geometry, StyleGuide) | ~12 | UI geometry and non-market scales, not market data. |

Migration checklist for a future strict pass: pull the live-quote and
derived-math groups through `<DataValue>` once the founder ratifies the
P0-06 contract for live surfaces (tooltips on every live number).
