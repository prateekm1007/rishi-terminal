// scripts/snapshotBatch.ts
// SNAPSHOT_BATCH_V3 - Pure fetch, no Supabase JS client, Node 20 compatible

import { STOCKS } from "../data/stocks";
import { buildConsensus } from "../lib/consensus";
import { SCORE_ENGINE_VERSION } from "../lib/consensus/version";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const HEADERS = {
  "apikey":        SERVICE_KEY,
  "Authorization": `Bearer ${SERVICE_KEY}`,
  "Content-Type":  "application/json",
  "Prefer":        "resolution=ignore-duplicates",
};

async function dbGet(path: string): Promise<any[]> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: "GET",
    headers: HEADERS,
  });
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status} ${await res.text()}`);
  return res.json();
}

// 010 (N2): rishi_snapshots is append-only — POST with
// resolution=ignore-duplicates AND an explicit on_conflict target maps
// to INSERT .. ON CONFLICT (symbol, snapshot_date) DO NOTHING. The first
// write of a (symbol, snapshot_date) wins (S2-07). Without on_conflict,
// PostgREST cannot infer the conflict target and a duplicate returns 409.
async function dbInsertIgnoreDuplicates(table: string, conflictCols: string, rows: any[]): Promise<void> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?on_conflict=${conflictCols}`, {
    method: "POST",
    headers: { ...HEADERS, "Prefer": "resolution=ignore-duplicates,return=minimal" },
    body: JSON.stringify(rows),
  });
  if (!res.ok) throw new Error(`INSERT ${table} failed: ${res.status} ${await res.text()}`);
}

async function snapshotNewStocks() {
  const today = new Date().toISOString().slice(0, 10);
  console.log(`\nRishi Memory Snapshot — ${today}`);
  console.log("=".repeat(50));

  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error("ERROR: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  // Get already-snapshotted symbols for today
  const existing = await dbGet(
    `rishi_snapshots?select=symbol&snapshot_date=eq.${today}`
  );
  const existingSymbols = new Set(existing.map((r: any) => r.symbol));

  const allSymbols = Object.keys(STOCKS);
  const missing    = allSymbols.filter(s => !existingSymbols.has(s));

  console.log(`Total stocks:        ${allSymbols.length}`);
  console.log(`Already snapshotted: ${existingSymbols.size}`);
  console.log(`Need to snapshot:    ${missing.length}`);

  if (missing.length === 0) {
    console.log("\nAll stocks already snapshotted today.");
    return;
  }

  console.log(`\nSnapshotting ${missing.length} stocks...\n`);

  let done   = 0;
  let errors = 0;
  let skipped = 0; // T11: stocks with null consensus (insufficient data)

  // Batch upserts: 25 at a time
  const BATCH = 25;

  for (let i = 0; i < missing.length; i += BATCH) {
    const chunk = missing.slice(i, i + BATCH);
    const rows: any[] = [];

    for (const sym of chunk) {
      try {
        const stock     = STOCKS[sym];
        const consensus = buildConsensus(stock);

        // T11: fail closed — null consensus (insufficient data) is skipped,
        // never persisted as 0, which would corrupt the historical series.
        if (consensus.consensus === null || !Number.isFinite(consensus.consensus)) {
          skipped++;
          continue;
        }

        const philosopherScores: Record<string, number> = {};
        for (const s of consensus.scores) {
          if (s.score === null) continue; // omit insufficient data, don't fabricate
          philosopherScores[s.label || s.name] = s.score;
        }

        rows.push({
          symbol:             sym,
          asset_category:     "stock",
          snapshot_date:      today,
          consensus_score:    consensus.consensus,
          score_engine_version: SCORE_ENGINE_VERSION,
          signal:             consensus.consensus >= 75 ? "BUY"
                            : consensus.consensus >= 45 ? "HOLD" : "SELL",
          disagreement:       0,
          philosopher_scores: philosopherScores,
          instability:        0,
          top_bull:           consensus.topBull?.label ?? null,
          top_bear:           consensus.topBear?.label ?? null,
          tension_spread:     consensus.tensionSpread ?? 0,
          majority_view:      consensus.consensus >= 60 ? "Bullish"
                            : consensus.consensus >= 40 ? "Neutral" : "Bearish",
          price_at_snapshot:  stock.price ?? 0,
          price_change_1d:    0,
          created_at:         new Date().toISOString(),
        });
      } catch (e: any) {
        errors++;
        console.error(`  SCORE ERROR ${sym}: ${e.message}`);
      }
    }

    if (rows.length > 0) {
      try {
        await dbInsertIgnoreDuplicates("rishi_snapshots", "symbol,snapshot_date", rows);
        done += rows.length;
        console.log(`  Batch ${Math.ceil((i + BATCH) / BATCH)}: inserted ${rows.length} — total ${done}/${missing.length}`);
      } catch (e: any) {
        errors += rows.length;
        console.error(`  DB ERROR batch ${Math.ceil((i + BATCH) / BATCH)}: ${e.message}`);
      }
    }
  }

  console.log("\n" + "=".repeat(50));
  console.log(`Done:              ${done}`);
  console.log(`Errors:            ${errors}`);
  console.log(`Total in DB today: ${existingSymbols.size + done}`);
}

snapshotNewStocks().catch(console.error);