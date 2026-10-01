// RISHI_MEMORY_V1
import { getAdminSupabase } from "./supabaseAdmin";
import { STOCKS } from "../../data/stocks";
import { buildConsensus } from "../consensus";
import { SCORE_ENGINE_VERSION } from "../consensus/version";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function snapshotAllStocks(): Promise<{
  snapshots: number;
  errors: number;
}> {
  const db = getAdminSupabase();
  const date = today();
  const symbols = Object.keys(STOCKS);

  let snapshots = 0;
  let errors = 0;

  for (const sym of symbols) {
    try {
      const stock = STOCKS[sym];
      const consensus = buildConsensus(stock);

      // T11: fail closed — records with insufficient data produce consensus
      // null and are NOT persisted. Writing a null/0 score would corrupt the
      // historical series the terminal reasons over.
      if (consensus.consensus === null || !Number.isFinite(consensus.consensus)) {
        console.warn(`[RishiMemory] ${sym}: consensus is null (insufficient data) — snapshot skipped`);
        errors++;
        continue;
      }

      const philosopherScores: Record<string, number> = {};
      for (const s of consensus.scores) {
        if (s.score === null) continue; // insufficient data — omit, don't fabricate
        philosopherScores[s.label || s.name] = s.score;
      }

      // 010 (N2): rishi_snapshots is append-only for every role. The first
      // write of a (symbol, snapshot_date) wins; a re-run of the nightly job
      // must be a no-op, never a rewrite of history (S2-07).
      const { error } = await db.from("rishi_snapshots").upsert({
        symbol:            sym,
        asset_category:    "stock",
        snapshot_date:     date,
        consensus_score:   consensus.consensus,
        score_engine_version: SCORE_ENGINE_VERSION,
        signal:            consensus.consensus >= 75 ? "BUY"
                          : consensus.consensus >= 45 ? "HOLD" : "SELL",
        disagreement:      0,
        philosopher_scores: philosopherScores,
        instability:       0,
        top_bull:          consensus.topBull?.label ?? null,
        top_bear:          consensus.topBear?.label ?? null,
        tension_spread:    consensus.tensionSpread,
        majority_view:     consensus.consensus >= 60 ? "Bullish"
                          : consensus.consensus >= 40 ? "Neutral" : "Bearish",
        price_at_snapshot: stock.price,
        price_change_1d:   0,
        created_at:        new Date().toISOString(),
      }, { onConflict: "symbol,snapshot_date", ignoreDuplicates: true });

      if (error) { errors++; } else { snapshots++; }

    } catch (e) {
      errors++;
      console.error(`[RishiMemory] ${sym}:`, e);
    }
  }

  return { snapshots, errors };
}