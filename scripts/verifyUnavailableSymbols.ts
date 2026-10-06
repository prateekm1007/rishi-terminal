// scripts/verifyUnavailableSymbols.ts — D1-02 (alias remediation, round 21)
//
// For every symbol in the honest-miss inventory (battery-state/
// unavailable-symbols.json, 133 entries from the production probe of
// 2026-10-06) this script determines — using the provider only, no
// guessing — whether the seed symbol is an OLD NSE symbol of an instrument
// that trades TODAY under a different symbol, or is genuinely unavailable.
//
// Gates (both must pass for a rename mapping to be accepted):
//   1. Provider probe: the CANDIDATE current symbol returns an INR
//      observation on the same transport the product uses (v7/spark), and
//      the OLD symbol (with .NS and .BO) returns nothing.
//   2. Name agreement: the provider's disclosed instrument name matches
//      the seed row's company name (normalized token overlap), so the
//      mapping cannot silently pair two different companies.
//
// Everything else stays UNRESOLVED — honest unavailability is the correct
// answer for delisted/suspended instruments (C1: never fabricate).
//
// Output: JSON artifact with the raw evidence per row (kept with the
// round's evidence file). Deterministic: same inputs -> same decisions.

import { STOCKS } from "../data/stocks";

interface SparkResult {
  spark?: {
    result?: Array<{
      symbol?: string;
      response?: Array<{ meta?: Record<string, unknown> }>;
    }>;
  };
}

interface SearchQuote {
  symbol?: string;
  exchange?: string;
  shortname?: string;
  longname?: string;
}

const UA = "Mozilla/5.0 (compatible; RishiTerminal/1.0)";
const INVENTORY_PATH = process.argv[2] ?? "/tmp/my-project/battery-state/unavailable-symbols.json";
const OUT_PATH = process.argv[3] ?? "/tmp/my-project/battery-state/unavailable-symbols-verification.json";
const NAME_OVERLAP_ACCEPT = 0.6;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function sparkProbe(symbols: string[]): Promise<Record<string, { price: number; currency: string; name: string | null }>> {
  const out: Record<string, { price: number; currency: string; name: string | null }> = {};
  const CHUNK = 20;
  for (let i = 0; i < symbols.length; i += CHUNK) {
    const group = symbols.slice(i, i + CHUNK);
    const url =
      "https://query1.finance.yahoo.com/v7/finance/spark?symbols=" +
      group.map((s) => encodeURIComponent(s.includes(".") ? s : `${s}.NS`)).join(",") +
      "&range=1d&interval=1d";
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(10000) });
      if (res.ok) {
        const data = (await res.json()) as SparkResult;
        for (const r of data?.spark?.result ?? []) {
          const meta = r?.response?.[0]?.meta;
          const price = Number(meta?.regularMarketPrice);
          if (r.symbol && meta && Number.isFinite(price) && price > 0) {
            out[r.symbol] = {
              price,
              currency: String(meta.currency ?? ""),
              name: (meta.shortName as string) ?? (meta.longName as string) ?? null,
            };
          }
        }
      }
    } catch {
      // transport failure for this group: recorded as a miss, same as the
      // product's honest-null behavior; the report shows it per symbol.
    }
    await sleep(300);
  }
  return out;
}

async function searchCandidates(query: string): Promise<SearchQuote[]> {
  const url =
    "https://query1.finance.yahoo.com/v1/finance/search?q=" +
    encodeURIComponent(query) +
    "&quotesCount=8&newsCount=0&listsCount=0";
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(10000) });
    if (!res.ok) return [];
    const data = (await res.json()) as { quotes?: SearchQuote[] };
    return data?.quotes ?? [];
  } catch {
    return [];
  }
}

export function normalizeName(name: string): string[] {
  const STOP = new Set(["ltd", "limited", "the", "ind", "corporation", "company", "co"]);
  return name
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOP.has(t));
}

function tokenOverlap(seedName: string, providerName: string): number {
  const seed = new Set(normalizeName(seedName));
  const prov = new Set(normalizeName(providerName));
  if (seed.size === 0 || prov.size === 0) return 0;
  let hit = 0;
  for (const t of seed) if (prov.has(t)) hit += 1;
  return hit / seed.size;
}

interface Row {
  symbol: string;
  seedName: string;
  oldProbeNS: string;
  oldProbeBO: string;
  candidates: Array<{ symbol: string; name: string; price: number; currency: string; overlap: number }>;
  decision: string;
  acceptedAlias: string | null;
  evidence: string;
}

async function main(): Promise<void> {
  const fs = await import("fs");
  const inventory: string[] = JSON.parse(fs.readFileSync(INVENTORY_PATH, "utf8"));
  const rows: Row[] = [];

  // Pass 0: confirm the old symbols really miss (.NS and .BO) on the wire.
  const nsSymbols = inventory.map((s) => `${s}.NS`);
  const boSymbols = inventory.map((s) => `${s}.BO`);
  const nsHits = await sparkProbe(nsSymbols);
  const boHits = await sparkProbe(boSymbols);
  console.error(`[verify] old-symbol probes: NS hits=${Object.keys(nsHits).length}/${inventory.length} BO hits=${Object.keys(boHits).length}/${inventory.length}`);

  for (const symbol of inventory) {
    const seed = STOCKS[symbol];
    const seedName = seed?.name ?? "(not in STOCKS)";
    const oldNS = nsHits[`${symbol}.NS`];
    const oldBO = boHits[`${symbol}.BO`];
    const row: Row = {
      symbol,
      seedName,
      oldProbeNS: oldNS ? `HIT ${oldNS.currency} ${oldNS.price}` : "miss",
      oldProbeBO: oldBO ? `HIT ${oldBO.currency} ${oldBO.price}` : "miss",
      candidates: [],
      decision: "unresolved",
      acceptedAlias: null,
      evidence: "",
    };

    if (oldNS || oldBO) {
      // The old symbol still trades: the defect is NOT a rename. Leave to
      // the honest-miss set (retry/transport investigation, not aliasing).
      row.decision = "old-symbol-still-trades";
      row.evidence = `old symbol returned ${oldNS ? "NS" : "BO"} payload`;
      rows.push(row);
      continue;
    }

    // Pass 1: search by the seed company name.
    const quotes = await searchCandidates(seedName);
    await sleep(700);
    const nseSymbols = new Set<string>();
    for (const q of quotes) {
      const ex = (q.exchange ?? "").toUpperCase();
      const sym = (q.symbol ?? "").toUpperCase();
      if (!sym) continue;
      if (ex === "NSI" || sym.endsWith(".NS")) nseSymbols.add(sym.endsWith(".NS") ? sym : `${sym}.NS`);
    }
    nseSymbols.delete(`${symbol}.NS`); // the old symbol itself is not a candidate
    if (nseSymbols.size === 0) {
      row.decision = "no-nse-search-candidate";
      row.evidence = `search "${seedName}" returned no NSE quote`;
      rows.push(row);
      continue;
    }

    // Pass 2: probe the candidates, gate on INR + name agreement.
    const candList = [...nseSymbols].slice(0, 8);
    const hits = await sparkProbe(candList);
    for (const [sym, h] of Object.entries(hits)) {
      if (h.currency !== "INR") continue;
      const overlap = tokenOverlap(seedName, h.name ?? "");
      row.candidates.push({
        symbol: sym,
        name: h.name ?? "(no name)",
        price: h.price,
        currency: h.currency,
        overlap: Math.round(overlap * 1000) / 1000,
      });
    }
    row.candidates.sort((a, b) => b.overlap - a.overlap);
    const best = row.candidates[0];
    if (best && best.overlap >= NAME_OVERLAP_ACCEPT) {
      row.decision = "rename";
      row.acceptedAlias = best.symbol.replace(/\.(NS|BO)$/, "");
      row.evidence = `provider "${best.name}" @ ${best.price} ${best.currency}; token overlap ${best.overlap}`;
    } else if (best) {
      row.decision = "candidate-name-mismatch";
      row.evidence = `best "${best.name}" overlap ${best.overlap} < ${NAME_OVERLAP_ACCEPT}`;
    } else {
      row.decision = "no-inr-candidate";
      row.evidence = "search returned NSE symbols but none returned an INR observation";
    }
    rows.push(row);
  }

  const renames = rows.filter((r) => r.decision === "rename");
  const summary = {
    generatedAt: new Date().toISOString(),
    inventory: inventory.length,
    probed: rows.length,
    renames: renames.length,
    unresolved: rows.length - renames.length,
    decisions: rows.reduce<Record<string, number>>((acc, r) => {
      acc[r.decision] = (acc[r.decision] ?? 0) + 1;
      return acc;
    }, {}),
  };
  fs.writeFileSync(OUT_PATH, JSON.stringify({ summary, rows }, null, 2) + "\n");
  console.error(`[verify] wrote ${OUT_PATH}`);
  console.log(JSON.stringify(summary, null, 2));
  console.log("--- rename mappings (accepted) ---");
  for (const r of renames) console.log(`${r.symbol} -> ${r.acceptedAlias}  (${r.evidence})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
