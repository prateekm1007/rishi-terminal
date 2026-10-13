/**
 * Server-only loader for the top-movers panel: reads the quote cache for every
 * stock in the product universe. Quotes come from the NSE quote feed, held in
 * the cache by the quotes warmer. The panel labels that source.
 */
import { STOCKS } from "@/data/stocks";
import { peekCachedQuotes } from "@/lib/quoteCache";
import { rankTopMovers, type MoverInput, type MoversResult } from "@/lib/markets/topMovers";

export async function loadMoverInputs(): Promise<MoverInput[]> {
  const symbols = Object.keys(STOCKS);
  const peeked = await peekCachedQuotes(symbols);
  const out: MoverInput[] = [];
  for (const sym of symbols) {
    const hit = peeked[sym];
    if (!hit) continue;
    const q = hit.quote;
    const name = String((STOCKS as Record<string, { name?: string }>)[sym]?.name ?? sym);
    out.push({
      symbol: sym,
      name,
      price: q.price,
      change: q.change,
      observedAt: q.observedAt,
      source: q.source,
    });
  }
  return out;
}

/** The panel's data: loads the cache and ranks it against the current clock. */
export async function loadTopMovers(): Promise<MoversResult> {
  const inputs = await loadMoverInputs();
  return rankTopMovers(inputs, { nowMs: Date.now() });
}
