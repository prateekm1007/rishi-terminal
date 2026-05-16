// RISHI_MEMORY_V1
import { getAdminSupabase } from "./supabaseAdmin";
import { STOCKS } from "../../data/stocks";
import { buildConsensus } from "../consensus";

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

      const philosopherScores: Record<string, number> = {};
      for (const s of consensus.scores) {
        philosopherScores[s.label || s.name] = s.score;
      }

      const { error } = await db.from("rishi_snapshots").upsert({
        symbol:            sym,
        asset_category:    "stock",
        snapshot_date:     date,
        consensus_score:   consensus.consensus,
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
      }, { onConflict: "symbol,snapshot_date" });

      if (error) { errors++; } else { snapshots++; }

    } catch (e) {
      errors++;
      console.error(`[RishiMemory] ${sym}:`, e);
    }
  }

  return { snapshots, errors };
}