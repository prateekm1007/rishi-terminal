# Demo spec vs the public URL + honest-page screenshots (founder order, 12 Oct 2026, item 7)

Date: 2026-10-12 ~17:35Z. Production serves `a104ee9` (#399 STALE-QUOTE build).

## test/demo/demo-path.spec.ts vs https://rishi-terminal.vercel.app

```
SMOKE_BASE_URL=https://rishi-terminal.vercel.app npx playwright test test/demo/demo-path.spec.ts --reporter=line
Running 6 tests using 1 worker
[1/6] search finds a stock and lands on its honest record
[2/6] verdict view: the seed record is the honest no-verdict record
[3/6] dissent expand: the wisdom tab opens to the honest no-verdict record
[4/6] flip expand: the honest state on seed data is the no-verdict record
[5/6] the quote never stale-masquerades (P0 stale step)
[6/6] watchlist add: the anonymous lab accepts a symbol and shows the row
6 passed (32.4s)
```

Chromium headless-shell 1243, viewport 1280x900, disclaimer pre-seeded
per the spec's own harness. No failures, no retries.

## Screenshots (this directory)

- `prod-reliance-honest.png` — /stock/RELIANCE full page: "No verdict —
  seed data" record, price 1,156.00 "Delayed · Yahoo Finance (unofficial)",
  **"as of Mon 12 Oct, 15:15 IST · stale"** live in a real browser (the P0
  stale rule rendering), "Rishi Wisdom / 21 Rishis: 20 scored, Jim Chanos
  chat-only" tab subtitle, Key Metrics + Peer Comparison intact, honest
  footer. Verified by reading the image before committing.
- `prod-dashboard-today.png` — dashboard Today view: no-verdict-allowed
  pick ("—"), "Verdicts produced today: none", "News: No headlines yet",
  "Forward-return tracking: not started", DELAYED MARKET DATA, live clock.

## Open observations (reported, not fixed here — out of scope)

- Key Metrics card carries a green "LIVE" chip beside seed P/E/ROE values.
  If the chip claims data liveness it contradicts the seed banner; if it
  means section-hydrated it needs a different word. Needs a founder-worded
  fix, not a silent edit.
- Peer table shows Adani Transmission P/E 45.0x with price "—" (P2 residue).
