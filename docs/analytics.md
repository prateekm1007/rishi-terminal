# Analytics — the activation event schema (G7-01, DEMO-5)

Status: SCHEMA ONLY — no vendor. The events are recorded to the
structured console sink until a monitoring vendor is chosen (ENG-5:
structured logs without PII). Nothing leaves the browser.

## Consent model (fail-closed, C2/C6)

- Consent is OFF by default. `useActivationEvents().track()` refuses
  every event until the visitor grants consent (the hook's
  `grantConsent()`).
- The consent WORDING is counsel-owned (FOUNDER DECISION NEEDED — the
  wording does not ship user-facing copy from the coder; the hook exposes
  the state machine, the UI copy comes from counsel).
- Consent state lives in `localStorage` under `rishi.analytics.consent`
  ("granted" | absent = not granted). It is not a secret (C2: anything
  hidden only in the browser is public) — it is a preference.

## The five activation events (DEMO-5, founder order 2026-10-12)

| Event | Surface | Properties |
|---|---|---|
| `search_performed` | GlobalSearchBar navigate | `query_length` (int, length only — never the query text), `result_symbol` |
| `stock_viewed` | stock page mount | `symbol` |
| `dissent_expanded` | Rishi Council dissent expand | `symbol` |
| `flip_expanded` | Rishi Council flip-conditions expand | `symbol` |
| `watchlist_added` | watchlist add action | `symbol` |

## Schema rules (enforced by test/analytics.consent.test.ts)

1. Every event name is in the closed union above — unknown names refuse.
2. Properties reject PII keys: `email`, `user_id`, `userid`, `name`,
   `phone`, `ip`, and any key CONTAINING `email`/`token`/`password`
   (case-insensitive). The zod schema fails the event; the hook drops it.
3. Property VALUES are strings or integers — no objects, no arrays, no
   free text longer than 128 chars. `query_length` is a count, never the
   query itself (no PII in events, G7-01).
4. Every event record carries `ts` (ISO string) and `event` — added by
   the hook, not the caller.

## Activation (PROPOSED, G7-01 — not decided)

3 watchlist adds or 1 portfolio import within 7 days. The definition is
PROPOSED and NOT computed anywhere yet; when the founder confirms it, the
computation lands with its own PR and this line retires.
