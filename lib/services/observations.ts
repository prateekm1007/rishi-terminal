// lib/services/observations.ts
// Phase 6 T61 — historical persistence of OUR OWN observations, strictly
// gated by storage rights.
//
// What is persisted: daily reference observations (FRED yield curve, FX
// reference rates) whose winning provider permits storing observed values
// (lib/livePrice.ts PERSISTABLE_SOURCES — evidence in
// docs/DATA_PROVIDER_MATRIX.md "Phase 6 storage policy").
//
// What is deliberately NOT persisted: equity/ETF/crypto quotes from scraped
// or terms-unverified sources (NSE, BSE, Yahoo, CoinGecko, screener) and
// India G-Sec proxies (yahoo-etf-proxy, DERIVED). The absolute principle:
// free != free to steal; open access != storage/redistribution rights.
//
// Failure posture: one symbol's failure never aborts the capture; counts
// are reported honestly to the caller (snapshot cron → ingestion log).

import 'server-only';

import { getAdminSupabase } from './supabaseAdmin';
import { fetchLivePrice, isPersistableSource, REFERENCE_SYMBOLS } from '../livePrice';

export type ObservationFetcher = (symbol: string) => Promise<{
  price: number;
  change: number;
  source: string;
  status?: string;
  /** Corrective gate 3: string|null — the upstream-disclosed observation
   *  time, or null when the upstream does not disclose one. */
  observedAt?: string | null;
} | null>;

export interface CaptureResult {
  eligible: number;   // symbols attempted (reference set)
  persisted: number;  // rows upserted into observed_prices
  skipped: number;    // unavailable or not storage-entitled (honest skip)
  errors: number;     // upstream/DB failures
}

const CAPTURE_CONCURRENCY = 5;

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Capture today's reference observations into `observed_prices`
 * (upsert on symbol+observed_date). Only rows whose winning source is
 * storage-entitled are written — everything else is skipped, never
 * fabricated.
 */
export async function captureReferenceObservations(
  fetcher: ObservationFetcher = fetchLivePrice,
): Promise<CaptureResult> {
  const db = getAdminSupabase();
  const date = todayIso();

  const result: CaptureResult = { eligible: 0, persisted: 0, skipped: 0, errors: 0 };
  const symbols = [...REFERENCE_SYMBOLS];

  for (let i = 0; i < symbols.length; i += CAPTURE_CONCURRENCY) {
    const batch = symbols.slice(i, i + CAPTURE_CONCURRENCY);
    await Promise.all(batch.map(async symbol => {
      result.eligible += 1;
      try {
        const point = await fetcher(symbol);
        if (!point || !Number.isFinite(point.price) || point.price <= 0) {
          result.skipped += 1; // honest unavailability — nothing written
          return;
        }
        if (!isPersistableSource(point.source)) {
          result.skipped += 1; // storage-rights gate — no entitlement, no row
          return;
        }
        if (!point.observedAt) {
          // Corrective gate 3: observed_prices.observed_at is NOT NULL
          // (migration 009) and we never fabricate an observation timestamp
          // to satisfy it. An observation whose upstream disclosed no time
          // is skipped honestly.
          result.skipped += 1;
          return;
        }
        const { error } = await db.from('observed_prices').upsert(
          {
            symbol,
            observed_date: date,
            price: point.price,
            source: point.source,
            observed_at: point.observedAt,
            created_at: new Date().toISOString(),
          },
          { onConflict: 'symbol,observed_date' },
        );
        if (error) {
          result.errors += 1;
          console.error(`[Observations] ${symbol} upsert failed:`, error.message);
        } else {
          result.persisted += 1;
        }
      } catch (e) {
        result.errors += 1;
        console.error(`[Observations] ${symbol}:`, e);
      }
    }));
  }

  return result;
}
