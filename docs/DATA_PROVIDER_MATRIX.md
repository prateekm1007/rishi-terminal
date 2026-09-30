# Data Provider Matrix — T64 Final Report (Phase 5)

**Date:** 2026-09-30 · Companion detail: `docs/FREE_OPEN_DATA_RESEARCH.md`

## What was researched
Existing stack (T37): NSE, BSE, Yahoo, Screener.in, CoinGecko, ExchangeRate-API,
FRED (fredgraph.csv), RSS news. Candidates (T34/T41): ECB reference rates, Alpha
Vantage, Twelve Data, FMP, Finnhub, Gemini, Hugging Face, open-source TA libs
(`trading-signals`), open-source data clients (`yahoo-finance2`).

## Approved (production, keyless — no credentials exist to leak)
| Provider | Dataset | Semantics | Health note |
|---|---|---|---|
| NSE (unofficial JSON) | IN equity quotes/indices/breadth | near-realtime snapshot | 2 schema-drift fixes shipped (50c986d, 47ab3f5); coercion + validation |
| BSE | scrip header fallback | snapshot | fallback only |
| Yahoo chart/quote | quotes, change, OHLC | delayed snapshot; never labelled realtime | `regularMarketChangePercent` trusted first |
| CoinGecko | crypto price/24h change | realtime snapshot | 429-prone → 60 s cache mandatory |
| ExchangeRate-API | FX reference | **daily reference**, not tradable | 30–43 ms |
| FRED fredgraph.csv | Treasury yields/macro | **daily reference** | keyless public download |
| ECB eurofxref (new, optional) | EUR FX reference | **daily official reference** | probe 200; attribution "European Central Bank" |
| RSS / Google News | headlines | timestamped links | link-out only |

## Approved (AI-track, project-owned credentials only)
- Primary: existing OpenAI-compatible endpoint (`CHAT_API_*`, already set)
- Fallback: Gemini (`GEMINI_API_KEY` — still to be provided by founder)

## Rejected — and why
- **Finnhub**: zero consumers (client removed in 50c986d); no data gap today
- **Python data clients** (yfinance et al.): foreign runtime, no coverage gain
- **`yahoo-finance2` adoption**: MIT client but client ≠ data rights (T54); own client exists

## RESEARCH_ONLY — must NOT enter production routing
- **Screener.in scrape**: legacy ingest frozen (no new consumers/fields); display
  licensing unresolved → founder decision FD-1
- **FMP**: free API ≠ display rights (T36 example); client stays inert
- **Alpha Vantage** (25/day), **Twelve Data** (8 credits/min, 800/day): quotas
  marginal for terminal traffic; display/commercial terms unverified this pass
- **FRED official API**: adopt only if fredgraph.csv insufficient; then
  `FRED_API_KEY` = project-owned server secret (T39)
- **Hugging Face inference**: AI-track evaluation; free credit ~$0.10/month
  (docs, subject to change) = evaluation capacity, not production capacity
- **`trading-signals`** (MIT): recommended future TA engine, gated by indicator
  parity tests before swap

## Requires project-owned credentials (none requested yet)
`FRED_API_KEY`, `TWELVEDATA_API_KEY`, `ALPHAVANTAGE_API_KEY`, HF token —
when adopted: deployment secrets, server-side, never committed, never
`NEXT_PUBLIC_`, never in URLs or logs; `.env.example` gains empty declarations
only (T42).

## Licensing restrictions recorded
1. Screener.in scrape — display/redistribution rights unresolved (founder-flagged)
2. FMP free plan — display requires licensing agreement
3. Yahoo ToS — no bulk redistribution; derived single-symbol display with attribution
4. CoinGecko — attribution required for display
5. ECB/FRED — attribution required ("European Central Bank" / "FRED, St. Louis Fed")

## What remains unavailable (honest gaps)
- Realtime tradable IN equity ticks from a licensed vendor (FD-1 pending)
- Point-in-time fundamentals with storage rights (roadmap D1)
- Full commercial-display licence for any third-party fundamentals vendor

## Claim hygiene
No "100% free data" claim is made. Current production stack is keyless and
free-as-in-no-fee; usage **rights** are documented per provider above, with
two surfaces (Screener-derived fundamentals; bulk redistribution generally)
explicitly gated on founder/vendor decisions. Synthetic numbers remain
prohibited: unavailable data renders as unavailable (T57), and the seed
placeholder can no longer leak through the live-price API.
