# E5 — user-facing AI latency, measured on the authenticated path (Round 18, 2026-10-06)

Closes the measurement half of founder Coder Directions 2026-10-05/06 directive 11:
measure user-facing latency with PoW (X7) attributed separately. Runs against
deployed production, not the local machine.

## Method

- Target: `https://rishi-terminal.vercel.app`, `/api/version` =
  `756bcabae03e26ed85e17f4bca91790c4c6e7c8a` (pre-#218 tip; #218 is a nav/docs
  change that does not touch the chat path). Provider identity from the wire:
  `chat-api` / `agnes-2.5-flash` on every row.
- Tool: `scripts/aiLatencyBattery.mjs` (merged via #203), 70 questions, 7
  classes, 6 s start-to-start pacing, bounded provider-shaped retries.
- Mode: **authenticated** — `BATTERY_COOKIE` carries a real Supabase session
  (measurement fixture `e5-battery@rishi-terminal.test`, minted via the admin
  API from the vault's Management PAT; password derived from a vault secret;
  session verified server-side by `/api/auth/me` 200 before the run). The chat
  route gates X7 under `if (!user)`, so authenticated rows are challenge-free
  **by the production code path, not by test instrumentation**. Zero rows were
  challenged in this run (verified in-artifact: `challenged: 0`, `powMs: 0`).
- Artifact: `docs/evidence/round18/ai-latency-battery-r18-authenticated.json`
  (70 rows; 69 HTTP 200 + 1 HTTP 413 = the hostile ~5.9 kB padding row
  refused by input validation — the fail-closed pass, not sample loss).

## Overall latency (client-observed wall, PoW excluded)

| metric | value |
|---|---|
| wall P50 | **17,560 ms** |
| wall P95 | **44,255 ms** |
| wall avg | 20,385 ms |

Per class (P50 / P95, ms): financial 17,945/27,709 · philosophy 7,724/23,368 ·
invalid 17,367/22,778 · hostile 8,674/33,315 · financialNoSymbol 14,278/44,255 ·
toolRequest 33,617/42,976 · **multitool 43,431/58,248** (sequential completions
stack: initial → per-tool → post-tool).

## Component attribution (server-side, from `provenance.timings`)

159 completions across 69 effective rows, 1,147 s of model time:

| stage | count | avg ms | share of model time |
|---|---|---|---|
| initial | 69 | 5,461 | 32.8% |
| post-tool | 59 | 7,891 | 40.6% |
| repair | 31 | 9,832 | 26.6% |

Tool executions: 60 total (47 ok / 13 unknown-symbol). **Cold vs warm is the
whole story**: 32/47 ok calls were warm quote-cache peeks under 200 ms
(median 72 ms); 12/47 were cold upstream fetches over 3 s (p90 ≈ 10,002 ms —
upstream-timeout-bound). Unknown-symbol calls return in ~0 ms (honest null,
no upstream call). Grounding/validation: 17 ms total across all 69 rows.
Route evidence assembly: ~0 ms (quote-cache peek path).

So the wall time is **model-completion dominated (~90%)**; tools add ~10%
and only when cold; validation and evidence assembly are noise. The two
actionable P95 drivers: (a) each repair adds ~9.8 s of extra completion;
(b) each cold tool adds up to ~10 s.

## PoW (X7) — measured separately, as directed

- Anonymous-mode battery (`ai-battery-r18-after.json`, same 70 questions,
  2026-10-06 04:57Z): 59/70 rows challenged; Node solver median **24 ms**,
  max 135 ms, plus one extra HTTP round trip per challenged request.
- Browser-side, the SHIPPED `/pow.worker.js` at difficulty 15, real Chromium
  under CDP CPU throttling, 9 runs per rate (raw, via
  `scripts/measurePowBrowser.mjs` under `scripts/ci/withCleanServer.mjs`):
  - rate 1x: runs=[133.8, 536.1, 290.5, 167.7, 116.1, 79.4, 42.0, 97.5, 27.6] ms → median 116.1 ms, p95 536.1 ms
  - rate 4x: runs=[132.6, 272.0, 282.2, 72.2, 144.8, 152.7, 111.6, 63.8, 42.4] ms → median 132.6 ms, p95 282.2 ms
  - rate 6x: runs=[81.2, 97.5, 151.1, 175.0, 49.7, 127.8, 44.4, 202.8, 240.0] ms → median 127.8 ms, p95 240.0 ms
  The shipped worker beats the 1–2 s design estimate; run-to-run hash luck
  dominates throttle rate at difficulty 15 on this hardware.
- Conclusion: PoW contributes **≈0.1–0.5 s + one round trip** to an
  challenged anonymous request — a small, bounded adder next to the 17.6 s
  P50 completion-dominated wall.

## Quality rates riding the same run (full sample, honest)

First-pass grounded 13/69 (18.8%), after-repair 24/69 (34.8%), repaired
31/69. Repair causes: field-value-mismatch 14 · missing-claims 8 ·
unsupported-numeric-prose 4 · schema-mismatch 3 · malformed-json 1 ·
zero-tool-engagement 1.

**Comparison discipline (C1)**: the earlier post-fix run
(`ai-battery-r18-after.json`, anonymous) reported 15/42 first-pass (35.7%) —
but its effective sample was 42/70 (19× HTTP 429 burst, 8× HTTP 502), and the
loss fell disproportionately on the slow classes (multitool 3/6, toolRequest
3/6 effective), i.e. easy-row survivorship inflated its rates. This run's
69/70 effective sample is the honest denominator. Against the pre-fix
baseline (first-pass 10.9%, eventual 30.9%): eventual grounding improved
(30.9% → 34.8% on a full sample), malformed-json went 7 → 1, and
unsupported-numeric-prose 11 → 4 — the #208 contract fixes hold under the
full sample; the dominant remaining class is **field-value-mismatch**, which
is priority (1) of the founder's R15 optimization order.

## Confounds

- One row hit an HTTP 502 provider streak (attemptStatuses [502, 502, 200]);
  the battery's bounded retry protocol recovered it; quota was refunded per
  R6.2. No other route-level failures.
- Single run, single time-of-day; model-side variance across runs is real
  (see the A-vs-B rates above). No latency claim beyond this run's numbers
  is made.
- The measurement account is a reversible fixture documented in the local
  vault; deletable via the admin API.

## What this measurement licenses next (not done here)

1. Repair-count reduction (field-value-mismatch) is now the single largest
   latency lever that is ALSO the top quality lever: 31 repairs × ~9.8 s.
2. Cold-tool prefetch/warming for the first question on an unpeeked symbol
   bounds the ~10 s cold tail.
3. Multitool rows stack sequential completions (P50 43 s); any future
   parallel-tool design must keep the bounded loop and grounding contract.
