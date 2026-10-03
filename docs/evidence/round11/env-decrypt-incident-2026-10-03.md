# R11-01 — Production env incident: decrypt-API envelope defect and v13 env-attach outage (2026-10-03)

## Summary

- Production chat and Supabase-dependent routes have been broken since
  2026-10-03T01:05Z (and an earlier wave ran on the Round-9 `0a0af32`
  deployment of Oct 2, misread at the time as "quota exhausted" and
  "Agnes free-tier vendor limit").
- Root cause (verified today, raw evidence below): the Vercel env API with
  `decrypt=true` returns **ciphertext envelopes, not plaintexts**, for
  `encrypted` entries. The v13 createDeployment **env-attach** path used by
  the out-of-repo deploy scripts therefore baked **envelope strings** as the
  runtime values of every encrypted variable, and **empty strings** for
  `sensitive` variables (whose values the API never returns).
- Consequence on the `03ef7fe` deployment (created 2026-10-03T01:00:13Z with
  12 env entries attached): `CHAT_API_KEY` was an envelope (provider rejects
  it as `Invalid token`), `SUPABASE_SERVICE_ROLE_KEY` was an envelope (every
  admin Supabase call fails, so `consume_chat_quota` fails closed and ALL
  anonymous chat returns 429 "Daily chat quota exhausted"), the client
  `NEXT_PUBLIC_SUPABASE_ANON_KEY` was an envelope, and `FMP_API_KEY` /
  `NEXTAUTH_SECRET` were empty strings.
- This is **not** a provider outage and **not** genuine quota exhaustion.
  The Agnes provider is healthy and the vault key completes HTTP 200
  (`agnes-2.5-flash`). No vendor or model change was made (Rule 31).
- Remediation applied: `CHAT_API_KEY` re-provisioned from the credentials
  vault (v10 env create; vault and HF mirror agree on the value); production
  redeployment moved to the **GitHub-integration path only** (internal
  decryption), which is the path the `6798f62` deployment used when chat,
  the 44/44 baseline battery, and the R9-12 proof all worked.

## Verified evidence (2026-10-03, ~03:07–03:40 UTC)

All values are identified by non-reversible sha256[:12] fingerprints;
no secret values appear in this document (Rule 34).

### 1. decrypt=true returns envelopes (sacrificial env var test)

```
POST /v10/projects/{pid}/env  {"key":"R11_DECRYPT_PROBE","value":"r11-decrypt-probe-<32hex>","target":["production"],"type":"encrypted"}
  -> HTTP 201                       (plaintext len 50, fp a9efd63f7a0e)
GET  /v9/projects/{pid}/env?decrypt=true
  -> value len 1136, fp 9155d6fe8852, decrypted=false, EXACT-MATCH: false,
     starts with marker prefix: false
GET  /v9/projects/{pid}/env         (no decrypt)
  -> value len 1136, fp 9155d6fe8852 — IDENTICAL to the decrypt=true fetch
```

A freshly created entry with a known 50-char plaintext returns a 1136-char
string that equals the no-decrypt response. The decrypt parameter is not
producing plaintext for encrypted entries.

### 2. Ground truth vs env fetch (Supabase keys)

| Key | True value (Supabase MGMT API) | Vercel env fetch (decrypt=true) |
|---|---|---|
| anon | len 208, JWT | len 1124, not a JWT |
| service_role | len 219, JWT | len 1108, not a JWT |

A Supabase anon key is a 208-char JWT; the env fetch shows a 1124-char
string. The fetched values are envelopes.

### 3. CHAT_API_KEY state across the three stores

| Store | fp (sha256:12) | len | Direct provider probe |
|---|---|---|---|
| credentials vault | d0c666a3842f | 51 | HTTP 200 in 656ms, model=agnes-2.5-flash |
| HF mirror (rule 32 durable copy) | d0c666a3842f | 51 | (same value as vault) |
| Vercel project env (before today) | 55aac02bcf7a | 1128 | HTTP 401 "Invalid token" in 75ms |

Note: the 401 in the third row is **not evidence about the stored key** —
the fetch returns the envelope, so the probe was sending the envelope as a
Bearer token. The pre-remediation stored key had worked on the
`6798f62` runtime (integration deploy, internal decryption) as late as
00:54Z per the Round-10 session record.

### 4. Remediation applied to the project env

```
DELETE /v9/projects/{pid}/env/p3ddPwlo6lkOUcrI        -> 200
POST  /v10/projects/{pid}/env  CHAT_API_KEY = <vault value>, type=encrypted,
      target=[production, preview]                     -> 201
verify fetch: envelope len 1136 (fp 1aa7842ae420) — envelope-formatted like
every other encrypted entry; the stored plaintext cannot be read back while
the decrypt API returns envelopes. Functional verification of the runtime
value is pending the redeploy (see below).
```

An intermediate `PATCH /v9/.../env/{id}` attempt left the entry in a
non-decryptable state and was superseded by the delete + v10 create.

### 5. Collateral findings

- `/home/z/my-project/.secrets/probe.env` (created 2026-10-02 17:34 from a
  "Vercel env decrypt" fetch) holds 1112–1182-char values — **envelopes**.
  It is not usable for probe-route authentication against correctly-deployed
  runtimes and must not be treated as plaintext.
- `FMP_API_KEY` and `NEXTAUTH_SECRET` are `type=sensitive`; the API returns
  no value for them, so the env-attach deploy path baked empty strings.
- Production probes during the incident: `/api/version` =
  `03ef7fe403789d16c2d94628a4d18b8e9ef00564`; anonymous `POST /api/chat`
  returned 429 "Daily chat quota exhausted" twice consecutively (2109ms,
  379ms) — consistent with `consume_chat_quota` failing closed on the broken
  admin key, not with genuine per-identity quota exhaustion.

## Corrected diagnosis timeline

| Time (UTC) | Event | Corrected reading |
|---|---|---|
| Oct 2 ~04:42 | CHAT_API_KEY env entry (re)created | stored key valid; runtime fine on integration deploys |
| Oct 2 (R9) | `0a0af32` deployed via v13 env-attach | envelopes baked; chat 429s + probe 502s began (misread as quota + vendor limit) |
| Oct 2 evening | `6798f62` deployed via GitHub integration | true env; chat, 44/44 baseline battery, R9-12 4/4 proof all worked |
| Oct 3 00:54 | provider "verified working" | true: provider + stored key healthy |
| Oct 3 01:00:13 | `03ef7fe` deployed via v13 env-attach | envelopes + empty sensitive baked |
| Oct 3 01:05→ | chat 401/502s, universal 429s | envelope `CHAT_API_KEY` → provider 401; envelope service key → fail-closed 429s |
| Oct 3 ~03:1x | "Agnes 401 incident" investigated | misdiagnosis: probes were sending envelopes as tokens |
| Oct 3 ~03:2x | this incident record | root cause proven; env re-provisioned from vault |

## Deploy-path implications (binding until superseded)

1. **GitHub integration (merge to main) is the only sanctioned deploy path.**
   Vercel decrypts project env internally; proven correct on `6798f62`.
2. **v13 createDeployment with explicit env attach is defective and
   superseded.** It bakes envelope strings for encrypted vars and empty
   strings for sensitive vars whenever the env API is in envelope-returning
   state. The out-of-repo script that drives it must not be used again.
3. v13 gitSource-only deploys have conflicting env-attach records (R9-era:
   "chat env WAS served"; R10-era: read as env-less). Do not use while the
   integration path is available.

## Pending post-deploy verification (on the integration-deployed SHA)

- `/api/version` equals the merged main SHA.
- Anonymous chat completes 200 for a quota-available identity (end-to-end:
  persona, evidence, provider, grounding).
- FMP-dependent fundamentals recover (non-empty `FMP_API_KEY` at runtime).
- Client Supabase initializes (true 208-char anon key in the bundle).
- The sandbox identity's actual quota count (via Supabase MGMT API) to
  disambiguate any residual 429s.
