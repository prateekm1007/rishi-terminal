#!/usr/bin/env node
/**
 * scripts/g7CanonicalStats.mjs — G7 Direction-13 corrective measurement.
 *
 * ONE canonical calculation over a latency-battery artifact's RAW ROWS,
 * producing ONE canonical result. Born from the round-23/round-25 audit,
 * which found the G7 evidence carried four inconsistencies:
 *   - row-level P50 (15.48 s) vs report-text P50 (15.5 s) — rounding only;
 *   - the artifact's per-class aggregate block was empty (resume-path
 *     artifact-shape bug), so narrative numbers had no in-artifact source;
 *   - refusal counts differed between narrative (429 x14 + 502 x3) and
 *     rows (429 x16 + 413 x1);
 *   - the narrative said PoW was excluded from wall while the artifact's
 *     measurementMode said the solve time was included.
 *
 * Rules:
 *   - Raw rows are the single source of truth. Aggregates are NEVER
 *     trusted; everything is recomputed from `raw`.
 *   - Historical artifacts are never rewritten: this script READS any
 *     battery artifact and emits the canonical block (stdout or a file).
 *   - BOTH wall variants are reported — wallInclPoW (as the browser
 *     experienced it) and wallExclPoW (the AI-loop cost). Attribution
 *     percentages are computed against wallExclPoW, because the X7 solve
 *     is not part of the loop under measurement. Neither number hides.
 *   - Usable rows = HTTP 200. Everything else is a refusal, counted by
 *     exact status (and fetchError separately) — never silently dropped.
 *
 * Usage:
 *   node scripts/g7CanonicalStats.mjs <artifact.json> [--out <file.json>]
 *   (importable: computeCanonical(artifact) for the battery to embed)
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

function percentile(arr, p) {
  if (arr.length === 0) return null;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx];
}

const mean = (arr) =>
  arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null;

/** One canonical slice over a row set (usable + refusals). */
export function canonicalSlice(rows) {
  const usable = rows.filter((r) => r.status === 200);
  const refusals = rows.filter((r) => r.status !== 200);
  const statusCounts = {};
  for (const r of refusals) {
    const key = r.fetchError ? "fetchError" : String(r.status);
    statusCounts[key] = (statusCounts[key] ?? 0) + 1;
  }
  const wallIncl = usable.map((r) => r.wallMs);
  const wallExcl = usable.map((r) => Math.max(0, r.wallMs - (r.powMs ?? 0)));

  // Stage attribution over usable rows, against wallExclPoW totals.
  const stages = { initial: 0, "post-tool": 0, repair: 0 };
  let toolMs = 0;
  let validationMs = 0;
  let ttfbMs = 0;
  for (const r of usable) {
    for (const c of r.completionStages ? Object.entries(r.completionStages) : []) {
      const [stage, s] = c;
      if (stages[stage] !== undefined) stages[stage] += s.msTotal ?? 0;
    }
    for (const t of r.toolExecutions ?? []) toolMs += t.ms ?? 0;
    validationMs += r.validationMs ?? 0;
    ttfbMs += r.ttfbMs ?? 0;
  }
  const wallExclTotal = wallExcl.reduce((a, b) => a + b, 0);
  const attributed =
    stages.initial + stages["post-tool"] + stages.repair + toolMs + validationMs;
  const unattributed = Math.max(0, wallExclTotal - attributed);

  const pct = (ms) =>
    wallExclTotal > 0 ? Math.round((ms / wallExclTotal) * 1000) / 10 : null;

  return {
    n: rows.length,
    usable: usable.length,
    refusals: refusals.length,
    refusalStatusCounts: statusCounts,
    wallInclPoW: {
      p50Ms: percentile(wallIncl, 50),
      p95Ms: percentile(wallIncl, 95),
      meanMs: mean(wallIncl),
    },
    wallExclPoW: {
      p50Ms: percentile(wallExcl, 50),
      p95Ms: percentile(wallExcl, 95),
      meanMs: mean(wallExcl),
    },
    attribution: {
      basis: "usable rows, wallExclPoW totals",
      wallExclPoWTotalMs: wallExclTotal,
      completionsInitialMs: stages.initial,
      completionsInitialPct: pct(stages.initial),
      completionsPostToolMs: stages["post-tool"],
      completionsPostToolPct: pct(stages["post-tool"]),
      completionsRepairMs: stages.repair,
      completionsRepairPct: pct(stages.repair),
      completionsTotalPct: pct(stages.initial + stages["post-tool"] + stages.repair),
      toolExecutionMs: toolMs,
      toolExecutionPct: pct(toolMs),
      validationMs,
      validationPct: pct(validationMs),
      ttfbMs,
      ttfbPct: pct(ttfbMs),
      unattributedMs: unattributed,
      unattributedPct: pct(unattributed),
    },
    grounded: usable.filter((r) => r.grounded === true).length,
    repaired: usable.filter((r) => (r.repairs ?? []).length > 0).length,
    repairCauses: (usable ?? []).reduce((m, r) => {
      for (const rep of r.repairs ?? []) m[rep.cause] = (m[rep.cause] ?? 0) + 1;
      return m;
    }, {}),
  };
}

/** The one canonical result for a whole battery artifact. */
export function computeCanonical(artifact) {
  const raw = artifact.raw ?? {};
  const classes = {};
  for (const [cls, rows] of Object.entries(raw)) classes[cls] = canonicalSlice(rows ?? []);
  const allRows = Object.values(raw).flatMap((rows) => rows ?? []);
  return {
    canonicalVersion: 1,
    source: {
      generatedAt: artifact.generatedAt ?? null,
      baseUrl: artifact.baseUrl ?? null,
      version: artifact.version ?? null,
      measurementMode: artifact.measurementMode ?? null,
    },
    rule: "raw rows are the only source; both wall variants reported; attribution basis = wallExclPoW",
    overall: canonicalSlice(allRows),
    classes,
  };
}

function main() {
  const argv = process.argv.slice(2);
  const file = argv[0];
  if (!file) {
    console.error("usage: node scripts/g7CanonicalStats.mjs <artifact.json> [--out <file.json>]");
    process.exit(2);
  }
  const artifact = JSON.parse(readFileSync(file, "utf8"));
  const canonical = computeCanonical(artifact);
  const outIdx = argv.indexOf("--out");
  if (outIdx >= 0 && argv[outIdx + 1]) {
    mkdirSync(dirname(argv[outIdx + 1]), { recursive: true });
    writeFileSync(argv[outIdx + 1], JSON.stringify(canonical, null, 2) + "\n");
    console.log(`canonical block written: ${argv[outIdx + 1]}`);
  }
  console.log(JSON.stringify(canonical.overall, null, 2));
  for (const [cls, c] of Object.entries(canonical.classes)) {
    console.log(
      `${cls}: usable=${c.usable}/${c.n} wallExclPoW p50=${c.wallExclPoW.p50Ms}ms p95=${c.wallExclPoW.p95Ms}ms refusals=${JSON.stringify(c.refusalStatusCounts)}`,
    );
  }
}

const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].split("/").pop());
if (isMain) main();
