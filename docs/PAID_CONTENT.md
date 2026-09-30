# Paid vs Free Content — Rishi Terminal

**Status:** R3 (round 2), 2026-09-30. **This matrix is the spec v2 assumption,
implemented; the founder has NOT yet ratified it** (spec §"Not for the coder",
item 1). Changing any line below requires moving the corresponding slice from
the server route to the client (or vice versa) — the enforcement is structural,
not cosmetic.

## The rule

Paid content is **served, not hidden**: it is computed on the server by routes
that call `getSessionUser()` and is serialised only for tiers entitled to it.
A free-tier (or anonymous) browser never receives the paid bytes, so "view
source" is no longer a payment bypass. UI hiding remains only as UX.

## Matrix

| Output | Free | Paid (student/disciple) | Served by |
|---|---|---|---|
| Consensus number (stock) | ✅ everyone | same | stock page RSC (static), screener |
| topBull / topBear summary | ✅ everyone | same | stock page RSC (static) |
| Per-Rishi verdicts (stock) — first 5 | ✅ everyone | same | stock page RSC (static, sliced to 5) |
| Per-Rishi verdicts (stock) — 6..20 | ❌ | ✅ | `GET /api/rishis/[symbol]` (401 anon, 5 for seeker, 20 for student/disciple) |
| Crypto guru verdicts with score ≥ 50 | ✅ everyone | same | `GET /api/gurus?kind=crypto` |
| Crypto guru verdicts with score < 50 | teaser (score only) | ✅ full | `GET /api/gurus?kind=crypto` |
| Commodity Energy-category verdicts | ✅ everyone | same | `GET /api/gurus?kind=commodity&symbol=…` |
| Commodity non-Energy verdicts | teaser (score only) | ✅ full | `GET /api/gurus?kind=commodity&symbol=…` |
| Commodity card average teaser | ✅ everyone | same | `GET /api/gurus?kind=commodity` (list mode) |
| Rishi dialogue (chat) | ❌ (401 anon) | ✅ quota-limited | `POST /api/chat` (T7; server-built prompt from the persona allow-list) |
| F&O advisor canned commentary | free-tier copy, UI-hidden by tier for UX | — | static template text (see note) |

## Notes and known residual gaps

1. **F&O `RishiStrategyAdvisor`** renders *canned* template copy seeded with
   the user's own strategy numbers (`RISHI_STATIC_RESPONSES`). It contains no
   market-data verdicts; the tier filter there is UX. The static copy is in
   the client bundle by construction (it is the offline fallback text).
2. **Chat canned fallbacks** (`components/chat/RishiChat.tsx` +
   `lib/chat/rishiEngine.ts`) are the documented free-tier offline fallback
   (the API 401s for anonymous). The *paid* dialogue runs server-side via
   `lib/chat/personas.ts` — `rishiEngine.ts` is imported only by the client
   chat UI for persona metadata, never by `/api/chat` (verified: the route
   imports `personas.ts`, and `grep -rln 'chat/rishiEngine'` returns only
   `components/chat/RishiChat.tsx`).
3. **Screener** computes the consensus number and top-rishi name client-side
   from the bundled seed registry (free fields only; the per-verdict content
   is never rendered there). Converting `/screener` to server rendering is
   explicitly out of scope for this round (spec §"Out of scope").
4. **The seed registry and the scoring engine code are public** (bundled JS).
   A technically skilled user can re-run the engine locally on the seed data.
   What they can no longer do is read the *served* product's paid verdicts
   without paying. A fully tamper-proof boundary requires not shipping the
   engine/registry to the client at all — that is the `/screener`/`/lab` SSR
   conversion, out of scope.

## Changing the matrix

Every row is enforced in exactly one place: the `slice`/filter in the serving
route (or the RSC slicing in `app/stock/[symbol]/page.tsx`). To move a row
between free and paid, change that one place and update
`test/rishis.route.test.ts` accordingly.
