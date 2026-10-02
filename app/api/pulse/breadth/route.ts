import { NextResponse } from 'next/server';
import { nseAllIndicesSchema, type NseIndex } from '@/lib/validation/schemas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const res = await fetch('https://www.nseindia.com/api/allIndices', {
      signal: AbortSignal.timeout(8000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.nseindia.com/',
        'Origin': 'https://www.nseindia.com',
      },
    });

    if (!res.ok) throw new Error('NSE allIndices HTTP ' + res.status);

    // R4: NSE is a trust boundary — validate the payload shape (zod) before
    // reading a single field; a schema mismatch fails closed (500) instead
    // of poisoning the breadth numbers with undefined/NaN.
    const parsed = nseAllIndicesSchema.safeParse(await res.json());
    if (!parsed.success) {
      throw new Error('NSE allIndices schema mismatch: ' + parsed.error.issues[0]?.message);
    }
    const indices: NseIndex[] = parsed.data.data ?? [];

    // Extract NIFTY 50, SENSEX equivalent, BANK NIFTY
    const bySymbol = (s: string): NseIndex | undefined =>
      indices.find(i => i.indexSymbol === s);
    const nifty     = bySymbol('NIFTY 50');
    const bankNifty = bySymbol('NIFTY BANK');
    const midcap    = bySymbol('NIFTY MIDCAP 100');
    const smallcap  = bySymbol('NIFTY SMALLCAP 100');
    const it        = bySymbol('NIFTY IT');
    const pharma    = bySymbol('NIFTY PHARMA');
    const auto      = bySymbol('NIFTY AUTO');
    const fmcg      = bySymbol('NIFTY FMCG');
    const metal     = bySymbol('NIFTY METAL');
    const realty    = bySymbol('NIFTY REALTY');
    const energy    = bySymbol('NIFTY ENERGY');
    const infra     = bySymbol('NIFTY INFRA');

    // Breadth: count advancing vs declining indices.
    // Round 9 §17 (Rule 16): an index WITHOUT a disclosed percentChange is
    // NOT "unchanged" — a missing observation is not a flat one. Such
    // indices are counted as `unknown` and excluded from the three
    // classified buckets; the ratio is null when declines = 0 (a count is
    // not a ratio — the old code returned the advances count as one).
    const allSectors = [nifty, bankNifty, midcap, smallcap, it, pharma, auto, fmcg, metal, realty, energy, infra].filter((i): i is NseIndex => Boolean(i));
    const classified = allSectors.filter(
      (i): i is NseIndex & { percentChange: number } =>
        typeof i.percentChange === "number" && Number.isFinite(i.percentChange),
    );
    const advances  = classified.filter(i => i.percentChange > 0).length;
    const declines  = classified.filter(i => i.percentChange < 0).length;
    const unchanged = classified.filter(i => i.percentChange === 0).length;
    const unknown   = allSectors.length - classified.length;

    // R9 §17: sector rows carry an explicit null for a missing percentChange
    // (undefined would serialize as an absent key — clients then coerce).
    const sectorData = [
      { sector: 'IT',       index: it,       symbol: 'NIFTY IT' },
      { sector: 'Pharma',   index: pharma,   symbol: 'NIFTY PHARMA' },
      { sector: 'Banking',  index: bankNifty,symbol: 'NIFTY BANK' },
      { sector: 'Auto',     index: auto,     symbol: 'NIFTY AUTO' },
      { sector: 'FMCG',     index: fmcg,     symbol: 'NIFTY FMCG' },
      { sector: 'Metal',    index: metal,    symbol: 'NIFTY METAL' },
      { sector: 'Energy',   index: energy,   symbol: 'NIFTY ENERGY' },
      { sector: 'Infra',    index: infra,    symbol: 'NIFTY INFRA' },
      { sector: 'Realty',   index: realty,   symbol: 'NIFTY REALTY' },
      { sector: 'Midcap',   index: midcap,   symbol: 'NIFTY MIDCAP 100' },
      { sector: 'Smallcap', index: smallcap, symbol: 'NIFTY SMALLCAP 100' },
    ].filter((s): s is typeof s & { index: NseIndex } => Boolean(s.index)).map(s => ({
      sector:     s.sector,
      last:       s.index.last,
      change:     s.index.variation,
      changePct:  s.index.percentChange ?? null,
      high:       s.index.high,
      low:        s.index.low,
      open:       s.index.open,
      prevClose:  s.index.previousClose,
      yearHigh:   s.index.yearHigh,
      yearLow:    s.index.yearLow,
    }));

    return NextResponse.json({
      nifty: nifty ? {
        last:      nifty.last,
        change:    nifty.variation,
        changePct: nifty.percentChange,
        high:      nifty.high,
        low:       nifty.low,
        open:      nifty.open,
        prevClose: nifty.previousClose,
        yearHigh:  nifty.yearHigh,
        yearLow:   nifty.yearLow,
        pe:        nifty.pe,
        pb:        nifty.pb,
      } : null,
      bankNifty: bankNifty ? {
        last:      bankNifty.last,
        change:    bankNifty.variation,
        changePct: bankNifty.percentChange,
        high:      bankNifty.high,
        low:       bankNifty.low,
      } : null,
      breadth: {
        advances,
        declines,
        unchanged,
        // R9 §17: indices with no disclosed percentChange — counted, not
        // silently relabelled "unchanged".
        unknown,
        total: allSectors.length,
        // R9 §17: a ratio needs a denominator; declines = 0 → null (the
        // raw counts above carry the truth).
        advanceDeclineRatio: declines > 0 ? parseFloat((advances / declines).toFixed(2)) : null,
      },
      sectors: sectorData,
      generatedAt: new Date().toISOString(),
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' },
    });

  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to fetch breadth', detail: String(err) },
      { status: 500 }
    );
  }
}
