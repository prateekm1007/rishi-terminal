# E4 scheduled in-session acceptance — pre-registered runbook (round 25)

Status as of 2026-10-07 ~16:50 UTC: the observer is COMMITTED on
`origin/main` (PR #245, merge commit `23640d1`, live in production at
`/api/version` = `23640d1...`). The only remaining E4 obligation is the
founder's acceptance run: **three consecutive scheduled in-session runs**
against the 896-symbol universe with the ≥807/896 freshness gate. This
runbook pre-registers the procedure so the executing session cannot move
the goalposts (C5/C10).

## What counts (fixed before the run — no renegotiation mid-run)

- **Universe**: exactly 896 STOCKS keys (`data/stocks/index.ts`), pinned by
  `test/e4Observer.test.mjs` (896 keys incl. J&KBANK, M&M, M&MFIN).
- **Gate**: `fresh ≥ 807` = `ceil(0.9 × 896)` over the 30-minute window.
- **Runs**: the pg_cron job `quotes-warm` (schedule `7-52/15 3-10 * * 1-5`,
  UTC) fires during the NSE session; the observer must observe ≥3
  `succeeded` runs in-session, then the battery runs. Zero manual warmer
  dispatches in the acceptance run — the observer NEVER dispatches the
  warmer (read-only by construction; grep-pinned).
- **Agreement**: `/api/health` `quoteCache.equities.{fresh,total}` must
  equal the universe-scoped SQL count and 896 exactly.
- **Controls** (positive + negative):
  - `BANKBARODA` returns a fresh price (round-22 precedent control);
  - `RELIANCE`, `TCS` (never aliased) return prices;
  - the nine #242 provider-alias keys (`BRAINBEES`, `GANESHHOUC`,
    `SOMDISTILL`, `TECHNO`, `SANDUMANG`, `ELDECO`, `JSLHISAR`,
    `LAXMIMACH`, `NAMINDIA`) return prices through the registry aliases;
  - `LTIM`, `CENTURYTEX` (honest-unavailable class) stay `UNAVAILABLE`.
- **Honesty**: `/api/health` `reasons` keep the fundamentals state
  ("no ingestion recorded yet" is acceptable and expected — G6 keeps the
  price signal and the fundamentals state independent); no fabricated
  freshness anywhere (stale renders stale).

## Execution procedure (the session that runs the acceptance)

1. Restore the credential chain (Constitution rule 33): vault at
   `download/rishi-credentials.txt`, or `.secrets/hf.token` → HF mirror.
   The observer needs `SUPABASE_MGMT_PAT` + `SUPABASE_PROJECT_REF` from
   the vault (read-only SQL through the Management API).
2. Bind the run: `git log --oneline -1` in the repo must show the merge
   that carries this runbook; record `/api/version` at start.
3. Start the observer in the FOREGROUND (the sandbox reaps background
   processes between tool calls — round-25 finding; the observer is
   resume-safe so foreground chunks are equivalent to one long run):

   ```
   SUPABASE_MGMT_PAT=... SUPABASE_PROJECT_REF=... \
     node scripts/e4SessionObserver.mjs --out /home/z/my-project/e4-r25 \
     --hours 1 --interval 240
   ```

   Repeat foreground chunks (each tool call may run up to ~9 minutes)
   until the `battery-early.json` artifact exists. The observer auto-fires
   the early battery once ≥3 in-session succeeded runs are observed and
   the late battery at ≥09:42 UTC. Keep the session alive across the
   window (first fire 03:07 UTC; in-session from 03:45 UTC).
4. The battery artifacts are written to `--out`:
   `battery-early.json`, `battery-late.json`, plus the append-only
   `state.jsonl` (poll/cron-runs/ingestion records). These are the raw
   outputs — commit them under `docs/evidence/roundNN/` with the closure
   note (raw output, rule 25).
5. Verdict: E4 closes only when BOTH batteries (or the early battery plus
   the late-session battery) show `pass.freshness && pass.healthAgreement
   && pass.bankbarodaFresh && pass.unavailableHonest` with fresh ≥ 807.
   Any single failing control keeps E4 OPEN with the raw artifact attached
   — never a partial pass.
6. If the session cannot stay alive across the window: run the observer in
   foreground chunks at session start and re-verify AFTER the window with
   read-only SQL (cron.job_run_details + quote_cache observed_at +
   ingestion_log) — the durable records make the proof retroactively
   auditable, but the in-session observation requirement (founder
   direction 5) demands the observer actually poll during the runs.
   Prefer staying in-session.

## Guardrails recorded here (so they cannot be quietly dropped)

- The observer is read-only: GETs of `/api/version` + `/api/health`, POSTs
  to `/api/prices/batch` (the page's own read path, 50-chunk, 1.2 s
  pacing), and read-only SQL. It never calls `/api/ingest/quotes-warm`.
- No weakening: if fresh lands at, say, 780/896, that is a FAIL — the
  unavailable set is classified honestly (provider-gap vs new regression),
  reported, and E4 stays open.
- No second observer implementation: the committed
  `scripts/e4SessionObserver.mjs` is the ONE observer (founder direction 7).
- The G3 boundary stands: migration `029_quotes_warm_schedule_pin.sql`
  stays unapplied until the founder comments `APPROVED: pg_cron` — the
  live scheduler in the DB is the one that runs; the migration artifact
  does not get applied by this acceptance.
