# Round 56 — LWC-CHART: lightweight-charts on the stock page, with the TradingView attribution

Founder order (13 Oct 2026): "Next: queued builds — lightweight-charts (+ attribution), …"
Adoption record: `docs/evidence/round55/r55-batch2-adoption-record.md` (tier-1 row 1).

## Licence verification (C1, primary sources, 2026-10-13)

- `tradingview/lightweight-charts` README (master, fetched): "This license requires
  specifying TradingView as the product creator. You shall add the "attribution notice"
  from the NOTICE file and a link to <https://www.tradingview.com/> to the page of your
  website or mobile application that is available to your users."
- NOTICE (fetched verbatim): "TradingView Lightweight Charts™ / Copyright (с) 2025
  TradingView, Inc. https://www.tradingview.com/" — the (с) is the upstream file's own
  Cyrillic character, reproduced as-is.
- Library installed: lightweight-charts 5.2.1 (Apache-2.0). `attributionLogo` verified
  present in the installed typings (`LayoutOptions.attributionLogo`, dist/typings.d.ts).

## Where the attribution renders (the founder's condition: "wherever the chart renders")

1. In-chart: `attributionLogo: true` in `components/stock/LwcSeriesChart.tsx` (the
   built-in TradingView logo link on the chart itself — README: "will satisfy the link
   requirement").
2. Card footer: the NOTICE text + the tradingview.com link render unconditionally in the
   `components/stock/PriceChart.tsx` footer — outside the loading/error/no-data states —
   on every chart render.

## Fail-first proof (C5)

- RED: `npx vitest run test/stockPriceChartAttribution.test.ts` on the pre-change tree —
  3 failed / 1 passed (the passing one is the C10 positive control proving the pinned
  file is the real chart). Raw: `lwc-attribution-red.txt` (vitest exit 1).
- GREEN: same command after the change — 4 passed (vitest exit 0). Raw:
  `lwc-attribution-green.txt`.

## Bundle (C9 paired guard)

The adapter (`LwcSeriesChart.tsx`) is imported by `next/dynamic` inside
`PriceChart.tsx`, which is itself already a `next/dynamic ssr:false` chunk inside
`StockPageClient` — lightweight-charts never enters the first-load script tags; the
ratchet baseline is untouched and the first-byte content is unchanged (the chart panel
was already client-only). `npm run bundle:budget` runs in CI on this PR (E6-02 ratchet).

## Scope

- `components/stock/PriceChart.tsx` — shell unchanged (timeframes, fetched-series
  header, source line, honest states, "AO · Not investment advice"); the hand-rolled
  SVG `LineChart` + tooltip machinery is replaced by the adapter; attribution added.
- `components/stock/LwcSeriesChart.tsx` — NEW: the lightweight-charts adapter (feature
  parity: hover-to-inspect tooltip, positive/negative colours, deterministic
  dedupe-by-second of the fetched series — nothing invented).
- `test/stockPriceChartAttribution.test.ts` — NEW: the DELIV-4-style pins.
- `package.json` / lockfile — lightweight-charts 5.2.1.
