# R11 round record — provider-env incident closure, intent/symbol/registry fixes, R10-03 AFTER battery

Date: 2026-10-03 (session 03:07–05:0x UTC) · Tree: `main = 1a49e86`
(code of `b089923` + docs) · Production during the session: `03ef7fe` →
`7dbe1e8` → `faa2348` (all integration deploys).

## 1. The production outage — root cause and closure (R11-01)

The "Agnes 401 provider incident" recorded on 2026-10-03 (checklist 🔴)
was **not a provider outage**. Verified chain of evidence:

1. The Vercel env API with `decrypt=true` returns **ciphertext envelopes**,
   not plaintexts, for encrypted entries — proven with a sacrificial env
   var (known 50-char plaintext returned as a 1136-char envelope,
   byte-identical to the no-decrypt fetch) and against ground truth
   (Supabase anon key is a 208-char JWT; the fetch showed 1124 chars).
2. The v13 **env-attach deploy path** therefore baked envelopes as runtime
   values on `03ef7fe` (created 01:00:13Z): `CHAT_API_KEY` = envelope →
   provider 401 "Invalid token"; `SUPABASE_SERVICE_ROLE_KEY` = envelope →
   `consume_chat_quota` fails closed → **universal 429 "quota exhausted"**
   (misread as real quota exhaustion); client anon key = envelope;
   `FMP_API_KEY`/`NEXTAUTH_SECRET` (type `sensitive`, never returned) =
   empty strings.
3. The same defect explains the R9-era `0a0af32` 429s (misread then as
   "quota exhausted" + "Agnes free-tier vendor limit").
4. The provider itself was healthy throughout: the vault key completes
   HTTP 200 (`agnes-2.5-flash`, 656ms direct probe). The vault and HF
   mirror agree (fp `d0c666a3842f`); the pre-remediation env entry held a
   different value whose envelope the probes were mistakenly sending as a
   Bearer token.

Remediation (all scripted, evidence in
`env-decrypt-incident-2026-10-03.md`):

- `CHAT_API_KEY` re-provisioned from the vault (v10 create; envelope
  consistent with every other encrypted entry). No vendor/model change
  (Rule 31) — the incident never justified one.
- Deploy path moved to the **GitHub integration only** (internal
  decryption — the path that served `6798f62` correctly when the 44/44
  baseline battery and the R9-12 4/4 proof ran). v13 env-attach ruled
  defective/superseded. The founder-supplied HF token matched the stored
  root secret (fp comparison) and was used for no provider switch.
- Recovery verified end-to-end on `7dbe1e8`: anonymous chat HTTP 200,
  grounded, `agnes-2.5-flash`, quota RPC functional — and the "quota
  exhausted" theory was disproven (identities had 30/21/21 of 150 used).

## 2. R11-02 — financial-intent rate/yield scoping (directive 8)

RED→GREEN in `test/financialIntent.test.ts`. The standalone `rate(s)` term
is gone; the bare word qualifies only anchored to a **non-equity
price-registry instrument** or a slashed FX pair. "rate my TCS research"
no longer triggers; "growth rate"/"margin rate" seed `getFinancials`;
"USD/INR rate"/"USDINR rate"/"gold rate" keep seeding `getPrices`;
"IN10YS yield" now seeds `getPrices` (the fixed-income surface);
"dividend yield" stays fundamentals. Merged as PR #84 (`1740c2e`).

## 3. R11-03 — chat symbol parameter through the canonical registry (directive 9)

RED→GREEN in `test/chat.route.registrySymbol.test.ts`. `normalizeSymbolInput`
is the ONE gate (accepts + canonicalises WTI/USDINR/BTC/…; slashed
spellings accepted; unknown → 400; malformed → 400). Non-equity symbols
seed an honest instrument package (price observation via the SAME builder
as `getPrices` + explicit `instrument:<sym>:non-equity` note; no
fabricated fundamentals). The concise `stockPrompt` is equity-only
(documented decision). **Honest units (Rule 3)**: the price-fact unit now
derives from the instrument (FX → quote currency; bonds → `percent`, the
observation is a yield; global commodities/crypto → `usd`; MCX → `inr`;
indexes → `points`) — this also corrects the `getPrices` tool path, which
previously mislabeled every non-equity price as `inr`. Merged as PR #86
(`2b6eca3`).

## 4. R11-04 — docs reconciliation + one-registry audit (directives 10–11)

`docs/AI_LOOP.md` no longer describes the pre-Commit-M "context-only
general path" — the runtime contract (same bounded loop for every request,
reactive seeding, fail-closed backstop) is now what the doc says. The
one-registry sweep found no new duplicate registries: every symbol-gated
surface imports the canonical gate; stock-only sites are documented
decisions; `aiLoopAudit` 8/8. Merged as PR #88 (`4b13204`).

## 5. R10-03 AFTER battery — the directive-4/6/7 measurement (finally valid)

44/44 effective rows on `7dbe1e8` (the R10-03 code tree; docs-only delta
from `03ef7fe`), **same provider/model as the baseline**
(`chat-api` / `agnes-2.5-flash` — `sameProviderModel: true`), same
question classes. Artifacts: `ai-latency-battery-r10-03-after-7dbe1e8.json`
+ `ai-latency-battery-r10-03-comparison.json`.

**Honest verdict — the R10-03 optimization is NOT a proven latency win:**

| Metric | BEFORE (6798f62) | AFTER (7dbe1e8) |
|---|---|---|
| first-pass grounded | 8/44 (18.2%) | 9/44 (20.5%) — within noise |
| final grounded | 12/44 | 15/44 |
| financial `noAnswerDespiteOkTools` | 6/22 | **6/22 — unmoved** |
| malformed-json repairs | 3 | **0** (eliminated) |
| schema-mismatch | 1 | **0** (eliminated) |
| unsupported-numeric-prose | 5 | 3 |
| field-value-mismatch | 5 | 7 (now co-dominant) |
| missing-claims | 6 | 7 (co-dominant) |
| financial wall p50 / p95 | 10.5s / 19.6s | 11.8s / 24.7s (provider variance confounds) |

R10-03 eliminated the malformed/schema failure classes and improved final
grounded rate (27% → 34%), but the dominant first-pass failure mass
(`missing-claims`, `field-value-mismatch`) persists and the target metric
(`noAnswerDespiteOkTools`) did not move — the next optimization target,
per the repair-cause taxonomy.

R9-12 four-case re-proof on `7dbe1e8`: **3/4** — all four tool-layer
registry behaviors correct (ok / ok / honest no-data / unknown-symbol);
the `[wti-price]` case failed at answer grounding (honest fail-closed
fallback, the same `noAnswerDespiteOkTools` class). Artifact:
`r912-registry-production-proof-7dbe1e8.json`.

## 6. Deployment gap (honest record)

`b089923`/`1a49e86` (the final code tree) is **not yet deployed**: the
Vercel free-tier deployment rate limit rejected the merge-triggered
production deploys ("retry in 24 hours" — statuses on both SHAs). Slots
free as 24h-old events age out. Production currently serves `faa2348`
(the R11-02 tree — chat healthy, R11-03's symbol/units fixes NOT live
until the next deploy). The next merge after slots free is the deploy
trigger (this PR, if merged after the window frees, serves exactly that
purpose). Window state probed via this branch's own preview deploy
attempts: still rate-limited at 04:44Z, 05:05Z, 05:22Z and 05:25Z (the freed
slot at ~05:23Z was consumed by this branch's own preview build before
the merge attempt); at ~05:47Z the staging project's preview deploy
SUCCEEDED (slots flowing) while the production project's attempt was
still limited.

## 7. Pending final-SHA proofs (directive 28 conditions 2/6)

On the deployed final SHA, still to run (scripts ready, quota available
~70 units on the sandbox identity):
1. `node scripts/prodR912RegistryProof.mjs https://rishi-terminal.vercel.app docs/evidence/round11/r912-registry-production-proof-<sha>.json`
2. `node scripts/prodUglyPathMatrix.mjs …` (full ugly-path matrix, directive 23)
3. `node scripts/prodPriceProvenanceSweep.mjs …` (live-price provenance, directive 19)
4. one `symbol=WTI` chat request (the directive-9 outer-contract path, live)
