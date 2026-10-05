# E1 — Hugging Face staging Space (measurement only)

Round 18, item E1. Founder directive: ONE private Docker Space, free
`cpu-basic`, `app_port: 7860`, multi-stage Dockerfile (Node 22, `npm ci`,
`next build`, `next start -p 7860 -H 0.0.0.0`), non-root user, healthcheck,
no production secrets, nothing Vercel-specific required. Production stays
on Vercel; the Space is a measurement target only.

## Result

- Space: `prateekm1/rishi-terminal` — private: true, sdk: docker.
- Runtime (HF API `GET /api/spaces/prateekm1/rishi-terminal/runtime`,
  2026-10-05T11:32Z): `"stage": "RUNNING"`,
  `"hardware": {"current": "cpu-basic", "requested": "cpu-basic"}`,
  `"gcTimeout": 172800` (the ~48 h free-tier sleep — E2 fact).
- App URL: `https://prateekm1-rishi-terminal.hf.space` (private Space:
  anonymous probes are masked as 404; authenticated probes carry
  `Authorization: Bearer <HF token>`).

### Acceptance probes on the Space URL (raw)

```
GET / -> 200
GET /screener -> 200
GET /stock/BANKBARODA -> 200
GET /api/health -> 503
{"status":"down","db":false,"lastPriceIngestAt":null,"lastFundamentalsIngestAt":null,"engineVersion":"rishi-merit-v1","asOf":"2026-10-05T11:31:15.699Z","quoteCache":null,"reasons":["db round-trip failed"]}
unauthenticated GET / -> 404 (private-Space control)
```

`/api/health` answers the honest degraded 503, not 200: the Space runs
seed-only (no DB env, per the founder's staging rule) and the endpoint
fails closed (Constitution C2). FOUNDER DECISION NEEDED is recorded on
PR #195: accept 503-degraded, or provide the free second Supabase
project for a real 200.

### CI docker-space job (the same image built/run by Docker, raw)

Run 37302855239 on head 836520d:

```
rishi-terminal-space:latest 1.38GB          <- image size (E2 input)
first 200 after 2 s (last code: 200)        <- container cold boot
GET / -> 200
GET /screener -> 200
GET /stock/BANKBARODA -> 200
GET /api/health -> 503
```

## Fail-first evidence (rule 24)

1. Invariants gate, local: deliberate `USER root` + secret-ARG violation
   -> 2 tests RED; restore -> 9/9 GREEN (pasted in PR #195).
2. Invariants gate, CI: scratch PR #196 (`USER root`) -> quality job RED
   at `x runs the runtime stage as a non-root user (uid 1000)`
   (run 37301122244). Closed unmerged; branch deleted.
3. CI docker build, real bite: first run failed
   `Error: ENOENT: no such file or directory, scandir '/app/docs/methodology'`
   -> `.dockerignore` un-excludes fixed in a3bd370 (the build itself is
   the bite for build-context content).
4. Runtime dep gate, local: moving `@next/bundle-analyzer` back to
   devDependencies -> RED (1 failed | 10 passed); restore -> GREEN
   (11 passed).

## Defects found and fixed (both caught by the new gates)

1. `docs/methodology/*.md` is build-time content (S2-01 loader reads it
   at build). The blanket `docs` + `*.md` dockerignore exclusions broke
   the build (ENOENT). Fixed a3bd370: last-match-wins un-excludes,
   ordering pinned by the invariants test.
2. `@next/bundle-analyzer` was a devDependency imported by
   `next.config.ts`. Self-hosted `next start` re-loads next.config at
   runtime with production-only node_modules -> `✓ Ready in 144ms` then
   `Cannot find module '@next/bundle-analyzer'` -> Space RUNTIME_ERROR
   and CI probes 000. Fixed 836520d: moved to `dependencies` (it is a
   genuine runtime requirement of the server config); new invariants
   test scans app/, lib/ and next.config.ts for devDependency imports.
   Vercel never surfaced this because its build installs dev deps.

## Secrets posture

No Space secret and no Space variable exists. The only build-time values
are the CI placeholder `NEXT_PUBLIC_*` defaults (public by design). The
production service-role key, CRON_SECRET, chat keys, ANON_ID_PEPPER and
QUOTES_WARM_SECRET are absent from the image (asserted by the
invariants gate scanning instruction lines).
