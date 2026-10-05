# Hugging Face Migration Plan (D1)

**Status: PLAN ONLY — no cutover in this change.** Founder order (Round 17): keep
Vercel serving until the Space passes every parity gate (D4), cut over only after
the founder says "go" (D6), and keep Vercel as the fallback for 7 days afterwards.
This document is the decision record the later steps implement.

Every platform fact below was checked against Hugging Face's own documentation on
**2026-10-05** (raw verification transcript: `docs/evidence/round17/d1-hf-migration-plan.md`).
Facts the docs do NOT state are collected in the unverified-facts ledger — the plan
never relies on them.

## 1. Platform facts (verified against HF docs, 2026-10-05)

| Fact | Verified value | HF source |
|---|---|---|
| Container SDK | `sdk: docker` in the Space `README.md` YAML front matter; the app must listen on `app_port` (default 7860) | Docker Spaces |
| Public URL | `https://<space-subdomain>.hf.space` (embed URL); the container gets `SPACE_HOST=<user>-<space>.hf.space` | Spaces Overview |
| Custom domain | PRO or Team & Enterprise plans only; CNAME record pointing to `hf.space`; public/protected Spaces only (not private) | Spaces Custom Domain |
| CPU Basic hardware | 2 vCPU, 16 GB RAM, 50 GB non-persistent disk, $0/h. Running a compute Space (Gradio or Docker) **requires a paid plan** — PRO is $9/month (personal) | Spaces Overview + Pricing |
| CPU Upgrade hardware | 8 vCPU, 32 GB RAM, $0.03/hour (≈ $21.90 per 720 h month) | Spaces Overview hardware table + Pricing |
| Sleep lifecycle | "On free hardware, your Space will 'go to sleep' and stop executing after a period of time if unused. If you wish for your Space to run indefinitely, consider upgrading to paid hardware." | Spaces Overview, Lifecycle management |
| Dev Mode | SSH / VS Code connection into a running Space for interactive debugging; a PRO-tier feature | Spaces Dev Mode (founder order: debugging only, disabled on production) |
| Secrets (runtime) | Managed in Space Settings; injected as environment variables — same read path the app uses today (`process.env`) | Docker Spaces, Secrets |
| Secrets (build time) | Different from Vercel: exposed via `RUN --mount=type=secret,id=NAME` reading `/run/secrets/NAME`; non-secret build-time variables arrive as **build-args** | Docker Spaces, Secrets/Variables |
| Disk | Ephemeral: "The data written on disk is lost whenever your Docker Space restarts." Persistence only via Storage Buckets (`/data`, runtime-only — never during build) | Docker Spaces, Data Persistence |
| Container user | Runs with **user ID 1000**; docs require creating the user and setting `WORKDIR` before any `COPY` | Docker Spaces, Permissions |
| Network | External traffic only on HTTPS 80/443 and port 8080; other ports blocked | Spaces Overview, Networking |

## 2. Unverified-facts ledger (C1 — the plan does not rely on these)

| Founder-stated fact | What the docs actually say | How the plan compensates |
|---|---|---|
| "Free Spaces sleep after 48 hours without traffic" | The 48 h figure is **not stated** in the fetched docs; they say "after a period of time if unused" | Superseded by the hardware decision: production runs CPU Upgrade (never sleeps — no ping needed); staging stays on free hardware and is *allowed* to sleep between measurement windows (a cold start before a probe is recorded, not worked around) |
| "`cpu-basic` can't set a custom sleep time" | No statement found in the fetched docs | No custom-sleep control is assumed on free hardware |
| "Any config change restarts the app" | Docs confirm disk is lost "whenever your Docker Space restarts" but do not enumerate which settings changes trigger restarts | Assume worst case: every `git push` rebuilds/restarts and every Space settings change may restart; all state stays in Supabase (already true) |
| PRO compute credits offset Spaces hardware billing | Not verified; the pricing page lists "inference credits" only | Cost table bills hardware hours at full list price; the founder checks his billing page for the credit amount |
| "Custom domains need a separate confirmation beyond the docs" | The Spaces Custom Domain doc states the feature is part of PRO or Team & Enterprise plans (verbatim excerpt in the evidence file) | Docs-verified, but the plan stays on the `*.hf.space` URL until the founder confirms it on his account; a domain remains an opt-in purchase decision |
| "PRO includes Dev Mode" | Founder's billing summary lists Dev Mode among PRO features; the plan only relies on the operational rule it implies | Dev Mode is treated as a debugging tool only — disabled on the production Space, setting recorded (D2) |

## 3. Consequences for this app

- **No serverless functions.** The app runs as one always-on `next start -p 7860 -H 0.0.0.0`
  process. The `vercel.json` `maxDuration` overrides (`prices/batch` 60 s, `prices` 30 s)
  become irrelevant; the practical limit becomes the HF proxy timeout, which D4 measures
  and records before cutover.
- **No global edge CDN.** Unlike Vercel, there is no automatic global edge network.
  Mitigations that need no decision: the app already ships `Cache-Control` headers on
  cacheable API routes and the PWA service worker caches the app shell. If warm TTFB
  p95 from India misses the ≤ 300 ms gate in D4, adding a CDN in front of the Space is
  `FOUNDER DECISION NEEDED` — it will not be added silently (C9).
- **ISR cache is per-container, on ephemeral disk.** Pages prerender at build time;
  after every restart the ISR cache is cold and the first hit per route regenerates it.
  D5 records post-restart time-to-first-full-page and the warmer re-primes data caches
  from Supabase (the persistent store — quote_cache, quota counters and rate limits all
  live in Postgres, so a restart loses no state that matters).
- **Keep-alive pings are retired.** Production runs on CPU Upgrade hardware, which does
  not sleep, so the external ping pattern is dropped entirely (founder order, 2026-10-05
  delta). Staging stays on CPU Basic and is allowed to sleep between measurement windows —
  a cold staging start before a probe run is expected and recorded, never worked around
  with pings.
- **Secrets arrive as environment variables** at runtime (identical read path). Build-time
  differences: `NEXT_PUBLIC_*` values are inlined at build — they must arrive as build-time
  VARIABLES (build-args declared with `ARG` in the Dockerfile). Secrets are never baked
  into the image (rule 8); the secret-scan gate must stay green (D2 acceptance).
- **Cron replacement.** `vercel.json` schedules two weekday crons (snapshot 13:30 UTC,
  observations 13:45 UTC). In a long-running container both run in-process during NSE
  hours, and the quote warmer moves in-process too — which also retires the GitHub Actions
  schedule that has never fired once (founder-audit defect 1, R16 C4 conclusive record).
  `CRON_SECRET` auth is kept for any externally-triggered ingest path.
- **`/api/version`** currently reads `VERCEL_GIT_COMMIT_SHA`. The commit SHA becomes a
  Docker build-arg (`GIT_SHA`) passed by the Space build; the endpoint reads the same
  build-arg-derived constant (D3), so C6's SHA-equality proof keeps working on HF.

## 4. PRO account verification and hardware decision (with numbers)

### Account state — verified live via API, 2026-10-05

`GET https://huggingface.co/api/whoami-v2` with the vault HF token (raw redacted output
in `docs/evidence/round17/d1-hf-migration-plan.md`):

- `isPro: true` — the founder's PRO account is confirmed from the account itself, not
  just the founder's checklist.
- `canPay: true`, `billingMode: prepaid` — paid hardware requests are payable.
- Token scope includes `repo.write` on the founder's own account — sufficient to create
  Spaces, push the container build, set Space secrets and request hardware (exercised
  live in D2; any scope gap surfaces there as a `BLOCKED`, not a workaround).

What PRO covers per Hugging Face's billing docs (founder summary, 2026-10-05): the plan
itself, 1 TB private storage, Docker Spaces on compute, Dev Mode, and some included
monthly compute credits. **Compute is billed separately** — the CPU Upgrade hardware
below is charged on top of PRO. The credit amount is not settled in the sources
reachable here (see the unverified-facts ledger); the founder checks his billing page.

### Hardware comparison (free-tier row kept for reference per founder order)

| Dimension | CPU Basic (free) | CPU Upgrade |
|---|---|---|
| vCPU / RAM | 2 / 16 GB | 8 / 32 GB |
| Hardware hourly cost | $0 | $0.03/h → **$21.90/mo** (720 h) |
| Sleeps when unused | Yes (duration not documented; pings required) | No — "run indefinitely" |
| Disk | 50 GB ephemeral | Ephemeral |
| Plan requirement | PRO $9/mo (required for any compute Space) | PRO $9/mo (already active) |
| **All-in monthly** | **≈ $9** (PRO only) | **≈ $31/mo** ($9 PRO + $21.90 hardware) |

**Decision (founder-approved in the 2026-10-05 delta): production on CPU Upgrade on
PRO; staging on CPU Basic.** The founder's checklist item is superseded by his explicit
order in the delta: "request `cpu-upgrade` hardware through the API and confirm it
applied" — executed in D2 and confirmed there. A live product must not depend on an
external ping to stay awake, and 2 vCPU is thin while serving traffic and regenerating
ISR simultaneously (D4 records actual measurements either way). Free-tier sleep no
longer matters for production: upgraded hardware does not sleep, so the keep-alive ping
is dropped (D5). Staging does not need always-on: sleeps between measurement windows are
acceptable, so it stays on free hardware. Monthly all-in cost: **≈ $31 production +
$0 staging** (PRO covers both), minus any PRO compute credits the founder's billing page
shows. Custom domain: planned on the `*.hf.space` URL; the docs confirm PRO eligibility,
but the domain remains the founder's opt-in purchase decision.

## 5. Rollback plan (cutover reversible in minutes)

1. **Overlap window:** during the 7-day fallback, the Vercel project keeps serving
   `rishi-terminal.vercel.app` with its env vars and Supabase URLs untouched.
2. **Path A (app-level, minutes):** revert the cutover commit on `main` (SITE_URL and
   auth redirect surface flip back); Vercel becomes canonical again. One merge + deploy.
3. **Path B (Space-level):** pause the Space in Settings — Vercel was serving the whole
   time and is unaffected.
4. **Supabase Auth:** the Space URL is *added* to the redirect allowlist for the overlap;
   the Vercel URL is only removed at the final cutover step, so sign-in works on both
   hosts during the window and re-adding the URL restores either path.
5. **Data:** Supabase is external to both hosts — there is no data migration to reverse.
6. Custom domain (if the founder opts in later) is additive on the HF side; dropping it
   returns traffic to the `*.hf.space` URL without touching Vercel. Until then the plan
   operates exclusively on the `*.hf.space` URL — no domain purchase is assumed or
   promised.

## 6. Step map and gates

| Step | Scope | Acceptance gate | Status |
|---|---|---|---|
| D1 | This document | Doc exists with decision table + rollback plan | This PR |
| D2 | Multi-stage Dockerfile (Node 22, non-root, healthcheck), `.dockerignore`, Space README front matter; production **and** staging Spaces created via API, both Docker SDK with `app_port: 7860`; Dev Mode off on production with the setting recorded; `cpu-upgrade` requested via API on production and confirmed | Invariants test green (fail-first proven, rule 24) + HF remote build succeeds (local `docker build` unavailable in the sandbox — recorded `BLOCKED` with the remote build as the sanctioned evidence) + `curl /api/health` 200 on the Space + hardware API confirmation | Pending |
| D3 | `SITE_URL` derivation, cron replacement, `GIT_SHA` version endpoint, client-IP re-derivation from a live probe, workflow rework, Vercel file removal, Supabase/CSP/SEO hosts | `git grep -n "vercel"` returns only deliberate mentions; every changed check written fail-first (rule 24) | Pending |
| D4 | Staging Space parity suite + TTFB/LCP table (10 routes, cold + warm) | Warm page TTFB p95 ≤ 300 ms, LCP ≤ 2.5 s, no new 5xx, cold start recorded | Pending |
| D5 | In-container NSE warmer (external keep-alive ping **dropped** — upgraded hardware does not sleep) + restart warm-up timing | `quote_cache` coverage ≥ 90 % of 916 proven from scheduled in-process runs during a live NSE session | Pending |
| D6 | Cutover | `BLOCKED:` on founder "go" (recorded in the D6 PR thread) | Pending |
| D7 | Backlog PR merges in founder's order | Order: #186 → #189 → #179 → #182 → #184 → #185 → #183 → #188 | Independent of D1–D6 |
