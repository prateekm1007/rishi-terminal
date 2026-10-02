import { NextRequest, NextResponse } from 'next/server';
import { fetchLivePrice, unavailablePriceEntry } from '@/lib/livePrice';
import { marketState } from '@/lib/marketHours';
import { cachedQuoteBatchForEquities, classifyPriceSymbols } from '@/lib/quotePath';
import { parseSymbolsBody } from '@/lib/registry/validateInput';
import { checkRateLimit } from '@/lib/rateLimit';
import {
  recordAppRequest,
  recordAppRequestDone,
  recordServe,
  type ServeEvent,
} from '@/lib/health/measurement';

/** T59.2: classify a served entry by its provenance status. */
function serveKind(status: unknown): ServeEvent["servedFrom"] {
  switch (status) {
    case "LIVE": return "live";
    case "CACHED": return "cache-replay";
    case "STATIC": return "static-reference";
    case "DERIVED": return "derived";
    default: return "unavailable";
  }
}

export async function POST(req: NextRequest) {
  try {
    // R6 persistent per-IP rate limit (fails open — the validation gate and
    // upstream quotas remain the hard bounds).
    const rl = await checkRateLimit(`data:ip:${clientIp(req)}`, 60, 60);
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const body: unknown = await req.json();

    // R5: registry/allow-list gate + batch cap (spec: 50).
    const parsed = parseSymbolsBody(body);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const symbols = parsed.symbols;

    // T59.2: this is an application request — counted separately from the
    // upstream calls it may or may not cause (never inferred).
    // Corrective gate: the returned id attributes THIS request's wall time
    // to THIS event, even under concurrent same-endpoint requests.
    const appReqId = recordAppRequest('/api/prices/batch', { symbols: symbols.length });

    const t0 = Date.now();
    const prices: Record<string, Record<string, unknown>> = {};

    // ── U2 (founder round 7): the shared quote cache IS the serving surface
    // for NSE-equity symbols. Upstream volume becomes O(1) per TTL per
    // symbol across ALL users and instances (migration 016/017): fresh rows
    // serve directly; one atomic refresh claim per stale symbol; THIS
    // request's claimed symbols refresh in ONE Yahoo-bulk sweep
    // (bulkRefreshQuotes). Classification comes from livePrice's own
    // routing sets via lib/quotePath (one source of truth, Rule 14).
    const { equities, others } = classifyPriceSymbols(symbols);

    const batchResult = await cachedQuoteBatchForEquities(equities);
    for (const sym of equities) {
      const r = batchResult.quotes[sym];
      if (r && r.quote) {
        prices[sym] = {
          price: r.quote.price,
          change: r.quote.change,
          changePercent24h: r.quote.change,
          volume24h: r.quote.volume24h,
          source: r.quote.source,
          // state→status honesty: a fresh upstream observation just landed
          // (stale-revalidated) is LIVE; serving an existing shared-cache
          // row (fresh/stale-served) is CACHED with its own provenance.
          status: r.state === 'stale-revalidated' ? 'LIVE' : 'CACHED',
          // T60.1 provenance preserved: lastUpdated is the ORIGINAL upstream
          // observation time — never the serve time; null stays null.
          lastUpdated: r.quote.observedAt ?? null,
          observedAt: r.quote.observedAt ?? null,
        };
        recordServe('/api/prices/batch', serveKind(prices[sym].status), 1);
      } else {
        // T57: honest unavailability per symbol — no zeros, no fabricated
        // observation timestamps.
        prices[sym] = unavailablePriceEntry();
        recordServe('/api/prices/batch', 'unavailable', 1);
      }
    }

    // Non-equity classes (crypto/forex/bonds/commodities/indices) keep the
    // direct multi-source path — the shared cache is NSE-session scoped.
    if (others.length > 0) {
      const results = await Promise.allSettled(
        others.map(s => fetchLivePrice(s))
      );

      results.forEach((r, i) => {
        if (r.status === 'fulfilled' && r.value) {
          prices[others[i]] = r.value as unknown as Record<string, unknown>;
          recordServe('/api/prices/batch', serveKind(r.value.status), 1);
        } else {
          // T57: explicit honest unavailability per symbol. Phase 5.1: the
          // entry carries NO observation timestamp — lastUpdated is null
          // (there is no observation) and checkedAt is the decision time.
          prices[others[i]] = unavailablePriceEntry();
          recordServe('/api/prices/batch', 'unavailable', 1);
        }
      });
    }

    // Phase 5.1 (T57): EXACTLY ONE normalized entry per requested symbol.
    // A symbol whose shared-cache lookup AND (for non-equity) per-symbol
    // fetch returned null / rejected is explicit: UNAVAILABLE with no
    // fabricated observation time.
    for (const s of symbols) {
      if (!prices[s]) {
        prices[s] = unavailablePriceEntry();
        recordServe('/api/prices/batch', 'unavailable', 1);
      }
    }

    const ms = Date.now() - t0;
    // T59.5: wall time of this application request, for latency attribution.
    recordAppRequestDone(appReqId, ms);
    console.log(
      `[/api/prices/batch] ${Object.keys(prices).length}/${symbols.length} in ${ms}ms ` +
      `(shared-cache equities: ${equities.length}, direct: ${others.length})`
    );

        // Normalize payload shape for clients:
    // - Provide { prices: ... } wrapper (expected by hooks/useLivePrices in UI)
    // - Keep legacy top-level symbol keys for backward compatibility
    // - Ensure changePercent24h exists by aliasing from change/changePercent
    // - U2: the NSE market state rides top-level so the client hook can
    //   adapt its polling cadence (server decides, Rule 7).
    // R4: the merged quote shape from the fetchers — only the fields the
    // normalisation below reads are declared.
    const normalized: Record<string, Record<string, unknown>> = {};
    const quoteMap = (prices ?? {}) as Record<string, Record<string, unknown>>;
    Object.keys(quoteMap).forEach((k) => {
      const v = quoteMap[k];
      if (!v) return;

      const ch =
        v.changePercent24h !== undefined
          ? v.changePercent24h
          : (v.changePercent !== undefined ? v.changePercent : v.change);

      normalized[k] = {
        ...v,
        change: v.change !== undefined ? v.change : ch,
        changePercent24h: ch,
      };
    });

    return NextResponse.json(
      { prices: normalized, market: marketState(), ...normalized },
      { headers: { 'Cache-Control': 'public, s-maxage=30' } }
    );
  } catch (error) {
    // Rule 10 (Coder Directions #12): generic outward, detailed inward. The
    // pre-O response leaked `(error as Error).message` as `details` —
    // upstream exception text (vendor URLs, connection errors) reached the
    // client. The detail stays in the server log only.
    console.error('[/api/prices/batch] error:', error);
    return NextResponse.json(
      { error: 'Batch fetch failed' },
      { status: 500 }
    );
  }
}
function clientIp(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) {
    const parts = fwd.split(',').map(s => s.trim()).filter(Boolean);
    if (parts.length > 0) return parts[parts.length - 1];
  }
  return req.headers.get('x-real-ip') ?? 'unknown';
}
