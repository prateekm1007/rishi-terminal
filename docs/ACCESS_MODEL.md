# Access Model — Rishi Terminal (canonical, current)

**Status:** Commit M, 2026-10-02; founder decision 2026-10-02 amends it:
chat and the Portfolio Lab require NO authentication. Founder decision
FD-7 is RESOLVED: all current product features are free, and there are no
entitlement tiers. This document is the canonical statement of who can use
what, and why. It supersedes `docs/PAID_CONTENT.md` (kept as a historical
record only).

## The one rule

The current product has **exactly one access state: FREE**. There is no
tier ladder, no paid plan, no upgrade path, and no disguised hierarchy
(free/basic/pro included). Every feature that ships today ships to
everyone.

## What "free" means in practice

| Surface | Who gets it | Where it is enforced |
|---|---|---|
| Stock pages — the FULL canonical Rishi verdict set (all 20) | every visitor | `/stock/[symbol]` RSC payload (`sanitizeConsensus` shapes the payload; it no longer gates) |
| `GET /api/rishis/[symbol]` — complete verdicts + knowledge graph | every caller (per-IP rate limit; Commit N1 — the Portfolio Lab's verdict upgrades need no sign-in) | server route |
| Screener & Portfolio Lab — full verdict set in slim rows | every visitor | `lib/scoring/slimIndex.ts` via RSC props; `/lab` page itself is PUBLIC (founder decision 2026-10-02 — lab data is browser-local) |
| Chat personas — every canonical persona | every caller (roster is public content; no sign-in, founder decision 2026-10-02) | `GET /api/chat/personas` |
| Crypto/commodity guru verdicts — all categories, full insight | every visitor | `GET /api/gurus` (server-computed, R3) |
| F&O surfaces | every visitor; data that does not exist is honestly `BLOCKED`/unavailable — never "paid" | `/fno/**` |
| AI chat (Rishi chat) | every caller — no sign-in (founder decision 2026-10-02), subject to the ONE free quota + burst limits | `POST /api/chat` |
| Pricing page | a truthful access statement — no storefront | `/pricing` |

## Authentication is not an entitlement tier

Founder decision 2026-10-02: **chatting with the Rishis and the Portfolio
Lab require no sign-in**. Authentication remains used ONLY for operations
that genuinely need an account (preferences; nothing today). The
per-symbol verdict route is now public too (Commit N1 — the Portfolio
Lab tabs that upgrade through it work without sign-in, per-IP
rate-limited).
It is protection and abuse control, never a product level:

- Chat spend is bounded WITHOUT auth: a signed-in session contributes its
  account id as the quota identity; an anonymous caller is keyed to a
  **pseudonymous per-IP digest** (`lib/auth/anonIdentity.ts`, W3: an HMAC
  under the `ANON_ID_PEPPER` server secret over the address, with IPv6
  truncated to its /64 prefix — one prefix, one quota). The digest is
  PSEUDONYMOUS, not anonymous: it is derived from the client IP and can
  be re-derived by the platform. The same atomic counter,
  refund-on-failure and fail-closed semantics apply to both (R12), plus
  GLOBAL daily request and token caps and a `CHAT_DISABLED` kill switch
  that bound total spend regardless of identity count (W3). The token
  cap is a HARD bound at admission: each request atomically reserves its
  worst-case completion budget and settles to the actual reported usage
  afterward (migration 020). The switch disables chat for ANY non-empty
  value except 0/false/off/no (ambiguous values fail closed).
- `lib/auth/session.ts` resolves **authentication identity only**
  (`id`, `email`). It no longer resolves any product tier.
- `GET /api/auth/me` returns `{ user: { id, email } }` or `{ user: null }` —
  never a tier.
- A user's historical `tier` / product-tier columns in `public.users` are
  **inert**: current code never reads them for access decisions, and
  changing such a value changes nothing (pinned by
  `test/freeaccess.access.test.ts`).
- Historical rows (`seeker`, `student`, `disciple`) receive exactly the
  same feature set and the same quota as everyone else.

## Quotas and rate limits are abuse/cost controls, not plans

- `POST /api/chat` enforces **one per-identity daily free quota**
  (`FREE_CHAT_DAILY_QUOTA`, `consume_chat_quota` RPC — atomic,
  refund-on-failure, fail-closed) plus a per-IP burst limit. The identity
  is the signed-in account id, or the deterministic per-IP uuid for
  anonymous callers. The limit is identical for everyone; it is not
  purchasable and not tier-dependent.
- These controls exist because the upstream costs money per call — they
  protect the service, they do not sell anything.

## What was removed (Commit M)

- The three-tier product model (seeker/student/disciple) from ALL current
  runtime authorization; no disguised replacement was introduced.
- The 5-vs-20 per-Rishi verdict split and the browser stock-view counter
  (`lib/premium.ts`, `localStorage` gates — deleted).
- The payment purchase path: `lib/payments/*`, `components/premium/*`,
  `hooks/useTier.ts` and the `razorpay` dependency are deleted; the
  `/api/payment` endpoints are retired with an honest `410 Gone` contract
  (no order can be created, no verification accepted, no code path reaches
  the historical grant RPC). No request, webhook, signature or RPC path can
  grant a current product entitlement.
- The persona registry's entitlement fields (`access`, the F&O axis) —
  `lib/chat/registry.ts` carries marketing display metadata only.
- `components/premium/PaymentButton.tsx` and `UpgradePrompt.tsx` (deleted;
  `/pricing` states the truth instead).

## What was deliberately preserved

- **Historical records are history, not entitlements:** migrations
  001–014 (including payment schema and the `grant_tier_for_payment` RPC)
  are the immutable record; historical `transactions` rows remain data
  evidence. No forward migration was required — the current state needs
  no schema change because current code simply no longer calls the
  historical grant system.
- **R3 architecture:** verdicts and guru scores are computed server-side;
  the scoring engine never ships to the client. The payload shaping in
  `sanitizeConsensus`/`slimIndex` keeps engine internals out of the
  bundle — that is payload control, not gating.
- **Honest unavailability:** where licensed market data does not exist
  (parts of the F&O suite), the product says unavailable/`BLOCKED`. It is
  never represented as "paid".

## Enforcement

`node scripts/freeAccessAudit.mjs` (CI: `npm run freeAccessAudit`) fails
when entitlement-gating or purchase-grant patterns re-enter runtime code
(app/, lib/, components/, hooks/), with a short, explicit allowlist for
historical material. `node scripts/aiLoopAudit.mjs` (CI:
`npm run aiLoopAudit`) enforces the unified AI-pipeline architecture
invariants documented in `docs/AI_LOOP.md`.
