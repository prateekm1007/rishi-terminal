// scripts/generateYahooAliases.ts (round 21, LP3)
//
// Builds lib/registry/yahooAliases.json from the committed verification
// artifact (docs/evidence/round21/unavailable-symbols-verification.json).
// Every mapping in the artifact passed BOTH pre-registered gates:
//   1. the OLD symbol returns nothing on the product's own transport
//      (v7/spark, .NS and .BO), and the CURRENT symbol returns an INR
//      observation;
//   2. the provider's disclosed instrument name agrees with the seed row's
//      company name (normalized token overlap >= 0.6).
//
// Judgment-call EXCLUSIONS are encoded here, with reasons, so the decision
// is auditable in code rather than buried in a notebook:
//   - TATAMOTORS: the 2025 demerger left two same-name candidates (TMCV
//     "Tata Motors Limited" and TMPV "Tata Motors Passenger Vehicles");
//     which entity the seed row represents is a product decision, not a
//     provider fact — the row stays honestly unavailable for now.
//   - KWALITY: the bare seed name "Kwality" matched both Kwality
//     Pharmaceuticals (KPL) and a second Kwality entity at overlap 1.0;
//     the seed row's company identity is not provider-establishable.
//
// Deterministic: same artifact -> same JSON.

import fs from "node:fs";
import { STOCKS } from "../data/stocks";

const ARTIFACT = process.argv[2] ?? "docs/evidence/round21/unavailable-symbols-verification.json";
const OUT = "lib/registry/yahooAliases.json";

const EXCLUDED: Record<string, string> = {
  TATAMOTORS:
    "2025 demerger: two same-name candidates (TMCV, TMPV) at overlap 1.0; which entity the seed row represents is a product decision, not a provider fact.",
  KWALITY:
    "Bare seed name 'Kwality' matched two different companies (Kwality Pharmaceuticals KPL and a second Kwality entity) at overlap 1.0; identity not provider-establishable.",
  // The five below are DUPLICATE SEED ROWS, not renames: the seed universe
  // holds the old symbol AND the current symbol as two separate rows for
  // the same instrument (T12's merge missed these pairs). The correct fix
  // is a registry merge (D1-02 follow-up) — aliasing would paper over a
  // seed-universe defect by serving one instrument's observation under two
  // row keys. Reported to the founder in the round-21 evidence.
  BLUESTAR:
    "Duplicate seed row: BLUESTARCO is itself a STOCKS key (current Blue Star symbol); the BLUESTAR row is the old symbol of the same instrument.",
  COLGATE:
    "Duplicate seed row: COLPAL is itself a STOCKS key; the COLGATE row is the old symbol of the same instrument.",
  INFOEDGE:
    "Duplicate seed row: NAUKRI is itself a STOCKS key; the INFOEDGE row is the old symbol of the same instrument.",
  JAINIRRIG:
    "Duplicate seed row: JISLJALEQS is itself a STOCKS key; the JAINIRRIG row is the old symbol of the same instrument.",
  TASYBITE:
    "Duplicate seed row: TASTYBITE is itself a STOCKS key; the TASYBITE row is a typo/old symbol of the same instrument.",
};

interface ArtifactRow {
  symbol: string;
  seedName: string;
  oldProbeNS: string;
  oldProbeBO: string;
  decision: string;
  acceptedAlias: string | null;
  evidence: string;
}

function fail(msg: string): never {
  console.error(`[generateYahooAliases] REFUSING: ${msg}`);
  process.exit(1);
}

const artifact = JSON.parse(fs.readFileSync(ARTIFACT, "utf8")) as { rows: ArtifactRow[] };
const rows = artifact.rows;

const map: Record<string, string> = {};
// Collect ALL collisions before writing anything: a value that is itself a
// STOCKS key means the seed universe holds the same instrument TWICE (an
// old and a current symbol as separate rows). Aliasing such a pair would
// create two cache rows and split freshness — the duplicate-row defect
// belongs to the registry work (D1-02), not to this map.
const collisions: string[] = [];
for (const row of rows) {
  if (row.decision !== "rename" || !row.acceptedAlias) continue;
  if (!EXCLUDED[row.symbol] && STOCKS[row.acceptedAlias]) collisions.push(`${row.symbol} -> ${row.acceptedAlias}`);
}
if (collisions.length > 0) {
  fail(`alias values that are themselves STOCKS keys (duplicate seed rows): ${collisions.join("; ")}`);
}
for (const row of rows) {
  if (row.decision !== "rename" || !row.acceptedAlias) continue;
  if (EXCLUDED[row.symbol]) {
    console.log(`[generateYahooAliases] excluded ${row.symbol} -> ${row.acceptedAlias} (${EXCLUDED[row.symbol]})`);
    continue;
  }
  if (row.oldProbeNS !== "miss" || row.oldProbeBO !== "miss") {
    fail(`${row.symbol}: accepted row must have missed on BOTH suffixes (NS=${row.oldProbeNS} BO=${row.oldProbeBO})`);
  }
  if (row.acceptedAlias === row.symbol) {
    fail(`${row.symbol}: identity mapping is not an alias`);
  }
  if (map[row.symbol]) {
    fail(`${row.symbol}: duplicate requested key`);
  }
  map[row.symbol] = row.acceptedAlias;
}

const values = Object.values(map);
if (new Set(values).size !== values.length) fail("alias values are not unique");

const ordered: Record<string, string> = {};
for (const k of Object.keys(map).sort()) ordered[k] = map[k];

const doc = {
  $comment:
    "LP3 (round 21): registry symbol -> CURRENT Yahoo/NSE provider identifier for the PRICE TRANSPORT only. " +
    "Generated by scripts/generateYahooAliases.ts from docs/evidence/round21/unavailable-symbols-verification.json " +
    "(provider probes: old symbol dead on .NS+.BO via v7/spark; current symbol returns INR; provider instrument name agrees with the seed row name). " +
    "Concept note: this is the provider-identifier map (what Yahoo serves), NOT the registry rename map " +
    "(lib/registry/tickerAliases.json — what users may type); the two legitimately differ where Yahoo lags or leads the registry (ABCL, ZENSAR, PURAVANKARA). " +
    "Cache rows stay keyed by the REQUESTED registry symbol; never key a cache row from this map.",
  ...ordered,
};

fs.writeFileSync(OUT, JSON.stringify(doc, null, 2) + "\n");
console.log(`[generateYahooAliases] wrote ${OUT} with ${Object.keys(ordered).length} entries`);
