# A7 Insight cache / deterministic change key (INT-A7, pre-registration)

Roadmap item A7 (`docs/INTELLIGENCE_ROADMAP.md`: "Insight cache /
change key"; execution rule 4: "A7 means a deterministic change key +
persistent cache — never in-memory memoization"). Dependencies: A3/A4
(the changeIds that back an insight are the A2/A3-native identities
`evt:<CATEGORY>:<changeId>` and their log rows) and A1 (the ONE
`RishiInsight` contract and its `parseRishiInsight` guard — the cache
never stores anything else).

This document is committed BEFORE any evaluation (the A5/A6
precedent). The key rule, the cache semantics, and the fail-closed
table are pinned by test — a silent change breaks the build.

## What this module is

1. **The ONE deterministic change key** (`changeKeyOf`): a pure
   function producing the stable identity of "the evidence set behind
   subject X for feature F" — sha256 over a canonical encoding of
   `feature | subject | sorted-unique changeIds`. Same evidence set →
   same key (order-insensitive, duplicate-insensitive); any different
   feature, subject, or changeId set → different key. This is the
   value A1's `provenance.changeKey` is reserved for.
2. **The persistent insight cache** (`readCachedInsight` /
   `writeCachedInsight` over migration 031's `insight_cache` table):
   generated insights are stored server-side keyed by the change key,
   with reuse accounting (`hit_count`, `last_hit_at`). Reads return the
   stored payload or null (the honest miss — never a guess). Writes
   parse the payload through A1's `parseRishiInsight` — parse or
   refuse, never best-effort (rule 6/9). Server service-role only; RLS
   deny-all for client roles (the 030 pattern).

## What this module is NOT

- not in-memory memoization (rule 4): no Map, no module-level cache —
  persistence is the table;
- not a second insight contract (A1 owns `RishiInsight`) and not a
  second evidence identity system (A2's changeIds flow through
  verbatim);
- not a generator: generation stays at A8+/A9; this item is identity +
  storage only;
- not a history system: `observation_state_log` remains the ONE
  history (rule 14); the cache stores finished artifacts, never
  transitions.

## Key rule (pinned)

```
changeKeyOf({ feature, subject, changeIds }) =
  sha256( feature + "|" + subject + "|" + sortedUnique(changeIds).join(",") )
```

- `feature` must be a member of A1's closed `INSIGHT_FEATURES`
  registry — an unknown feature refuses (null), never a free string;
- `subject` must be a non-empty trimmed string (max 80, the A1
  subject bound);
- `changeIds`: at least one non-empty string; duplicates collapse
  (set semantics); ordering never matters (sorted before encoding);
- key format: 64-char lowercase hex;
- every refusal returns `null` (the honest no-key — an insight with no
  evidence set is not cacheable and not identity-bearing).

## Cache semantics (pinned)

| Operation | Rule |
|---|---|
| `writeCachedInsight({ changeKey, feature, subject, payload })` | payload is parsed through A1's `parseRishiInsight`; a non-contract payload is REFUSED (result carries the refusal — never best-effort stored). A valid payload is upserted ON CONFLICT (change_key): payload and generated_at replaced, `hit_count` PRESERVED (reuse accounting survives a regeneration) |
| `readCachedInsight(changeKey)` | returns the stored payload + meta, or null on miss; every hit increments `hit_count` and stamps `last_hit_at` (database clock — the module keeps no clock) |
| miss | null (never a fabricated insight, never a stale fallback under a newer key) |

## Fail-closed table (all named)

| Input | Treatment |
|---|---|
| unknown feature (not in `INSIGHT_FEATURES`) | `changeKeyOf` → null |
| empty/whitespace subject, subject > 80 chars | `changeKeyOf` → null |
| empty changeIds array; any empty changeId string | `changeKeyOf` → null |
| payload failing `parseRishiInsight` | write refused (no row written) |
| unknown changeKey on read | null (miss) |

## Schema (migration 031, closed column set)

`insight_cache(change_key 64-hex UNIQUE, feature, subject, payload
jsonb-object, generated_at, hit_count >= 0, last_hit_at)` — RLS
enabled with NO policies; `REVOKE ALL ... FROM anon, authenticated`
(the 030 pattern). DB-side checks: `change_key` length 64, payload a
jsonb object (never a JSON null), `hit_count >= 0`. The closed feature
registry is enforced at the write boundary in TS (the DB keeps length
checks so a registry addition is a TS-enum + test change, not a
forced migration; the registry's own rule already requires the enum
edit in the feature's PR).

## Determinism and honesty pins

- same inputs → same key, byte-stable; no clock/randomness/AI surface
  in the pure layer (`generated_at`/`last_hit_at` are database NOW());
- `hit_count` only ever increases (SQL CHECK >= 0 + UPDATE +1);
- a miss is `null` — the unknown stays unknown (rule 16);
- the cache stores only `parseRishiInsight`-valid artifacts — one
  insight contract, one parser (rule 14).
