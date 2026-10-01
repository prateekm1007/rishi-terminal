/**
 * lib/db/nameAgreement.ts — the name-agreement gate (audit round 4, Q3).
 *
 * A direct symbol match between the seed dataset and the official NSE
 * listing binds seed data to whatever company the listing maps the symbol
 * to. Symbol equality alone does NOT prove the two refer to the same
 * company: seed "Power Mech" bound to symbol POWERINDIA silently attached
 * Power Mech's numbers to Hitachi Energy India (a real round-4 finding).
 *
 * This module decides whether a seed name and the official listing name
 * "agree enough" for a direct symbol match to count, and models the
 * curated review decisions recorded in
 * data/security-master/name_overrides.json (every entry carries sources).
 *
 * Deliberately dependency-free (like lib/db/securityMaster.ts): the
 * generator, the validator, CI tooling and tests import the same pure
 * logic — one source of truth for the gate.
 *
 * Gate rule (deterministic, no guessing):
 *   1. Punctuation/space variants of the same string agree
 *      ("Divi's Laboratories" vs "Divis Laboratories").
 *   2. Otherwise the names must share >= 2 distinctive tokens, or the
 *      smaller side must be a single token contained in the other
 *      ("CAMS" vs "CAMS Chemicals…" would agree; "CAMS" vs "Computer Age
 *      Management Services" does not — an acronym needs a curated entry).
 *   Tokens: lowercase, split on non-alphanumerics, single characters and
 *   generic corporate suffixes ("limited", "india", "&", "of", …) dropped.
 *   Anything the rule rejects but a human has reviewed lands in
 *   name_overrides.json with evidence; anything unreviewed is a
 *   NAME_MISMATCH (universe.data_quality), never a silent bind.
 */

export const NAME_SUFFIXES = new Set([
  "ltd", "limited", "plc", "inc", "india", "co", "corp", "corporation",
  "company", "&", "and", "of", "the",
]);

export function nameTokens(name: string): Set<string> {
  return new Set(
    name
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length > 1 && !NAME_SUFFIXES.has(t)),
  );
}

/** Punctuation/space-insensitive key: "Venky's (India)" == "Venkys India". */
export function rawAlnumKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

const CORP_SUFFIX_WORDS = new Set(["limited", "ltd", "plc", "inc", "private", "pvt", "co"]);
/** Drop trailing corporate-suffix words so "Capacite Infraprojects" equals
 *  "Capacit'e Infraprojects Limited". Identity-bearing words are untouched. */
function stripTrailingCorpSuffix(name: string): string {
  const words = name.trim().split(/\s+/);
  while (words.length > 1 && CORP_SUFFIX_WORDS.has(words[words.length - 1].toLowerCase())) words.pop();
  return words.join(" ");
}

export interface AgreementResult {
  ok: boolean;
  /** Number of distinctive tokens the two names share (diagnostics). */
  sharedTokens: number;
  /** Which rule decided: "raw-equal" | "token-overlap" | "rejected". */
  rule: "raw-equal" | "token-overlap" | "rejected";
}

export function agreesEnough(seedName: string, officialName: string): AgreementResult {
  if (rawAlnumKey(stripTrailingCorpSuffix(seedName)) === rawAlnumKey(stripTrailingCorpSuffix(officialName))) {
    return { ok: true, sharedTokens: -1, rule: "raw-equal" };
  }
  const s = nameTokens(seedName);
  const o = nameTokens(officialName);
  let shared = 0;
  for (const t of s) if (o.has(t)) shared++;
  const minSize = Math.min(s.size, o.size);
  // Deliberately NO single-token rule here: one shared token is too weak —
  // "Some Infra" vs "Other Infra Limited" share exactly the generic token
  // "infra" (19 official companies contain it) and are different companies.
  // A one-token abbreviation that is not a suffix-stripped raw match (HAL,
  // BEL, CAMS…) must go through a curated entry — default deny.
  const ok = minSize > 0 && shared >= 2;
  return { ok, sharedTokens: shared, rule: ok ? "token-overlap" : "rejected" };
}

// ── Curated review decisions (data/security-master/name_overrides.json) ──

export type NameVerdict = "SAME_COMPANY" | "RENAMED" | "WRONG_BINDING";
export type NameAction = "BIND_WITH_OVERRIDE" | "UPDATE_SEED_NAME" | "REMOVE_SEED_RECORD";

export interface NameOverrideEntry {
  symbol: string;
  /** Seed name as it stood when the decision was made. */
  seedName: string;
  /** Official listing name the symbol maps to (must match the CSV). */
  officialName: string;
  verdict: NameVerdict;
  action: NameAction;
  /** Required for UPDATE_SEED_NAME: the seed record now carries this. */
  updatedSeedName?: string;
  /** Why the decision holds, one honest sentence. */
  basis: string;
  /** At least one checkable source (URL) or the pinned CSV row. */
  sources: string[];
  reviewedOn: string; // ISO date
  reviewedBy: string;
}

export interface NameOverridesFile {
  $comment?: string;
  entries: NameOverrideEntry[];
}

export function parseNameOverrides(raw: unknown): NameOverridesFile {
  const d = raw as NameOverridesFile;
  if (!d || !Array.isArray(d.entries)) {
    throw new Error("name_overrides.json malformed: expected { entries: [...] }");
  }
  for (const e of d.entries) {
    if (!e.symbol || !e.seedName || !e.officialName || !e.verdict || !e.action) {
      throw new Error(`name_overrides.json entry missing required fields: ${JSON.stringify(e).slice(0, 120)}`);
    }
    if (!Array.isArray(e.sources) || e.sources.length === 0) {
      throw new Error(`name_overrides.json entry ${e.symbol}: every decision must carry at least one source`);
    }
    if (e.action === "UPDATE_SEED_NAME" && !e.updatedSeedName) {
      throw new Error(`name_overrides.json entry ${e.symbol}: UPDATE_SEED_NAME requires updatedSeedName`);
    }
  }
  return d;
}

// ── Override lifecycle (Q3 Commit B — stale-override gate) ──────────────
// The auditor (round 4): V7 skipped an override whose symbol no longer had
// a direct listing row (`if (!row) continue`), so such an entry could live
// forever without being challenged. Every curated entry is now classified
// into exactly one of three states; only "active-valid" passes silently.

export type OverrideStatus = "active-valid" | "inactive-historical" | "stale-requires-review";

/** What the live database/listing says about an override's symbol right now. */
export interface OverrideContext {
  /** The symbol appears in the current official listing as a direct row
   *  (source nse:equity_l, valid_to IS NULL). */
  listedDirect: boolean;
  /** The live listing name for the symbol (null when not listedDirect). */
  liveName: string | null;
  /** The seed dataset (STOCKS) still carries this symbol. */
  seedPresent: boolean;
  /** symbol_history still has an active (valid_to IS NULL) row binding it. */
  activeBound: boolean;
}

export function classifyOverrideStatus(
  entry: NameOverrideEntry,
  ctx: OverrideContext,
): { status: OverrideStatus; reason: string } {
  if (ctx.listedDirect) {
    if (ctx.liveName === entry.officialName) {
      return {
        status: "active-valid",
        reason: "binding verified against the current official listing row",
      };
    }
    return {
      status: "stale-requires-review",
      reason: `listing row moved: the entry pins "${entry.officialName}" but the live listing says "${ctx.liveName ?? "(no name)"}" — re-review required`,
    };
  }
  if (ctx.seedPresent || ctx.activeBound) {
    return {
      status: "stale-requires-review",
      reason: `the symbol no longer appears in the official listing but the override still does binding work (seed record present: ${ctx.seedPresent}; active symbol_history row: ${ctx.activeBound}) — the pinned officialName "${entry.officialName}" can no longer be re-verified; re-review required`,
    };
  }
  return {
    status: "inactive-historical",
    reason:
      "kept for provenance: the symbol left the official listing and no seed record or active binding references it — reported on every validator run, never silently skipped",
  };
}
