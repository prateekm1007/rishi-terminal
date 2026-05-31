import { NextResponse } from 'next/server';

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

    const data = await res.json();
    const indices = data?.data || [];

    // Extract NIFTY 50, SENSEX equivalent, BANK NIFTY
    const nifty     = indices.find((i: any) => i.indexSymbol === 'NIFTY 50');
    const bankNifty = indices.find((i: any) => i.indexSymbol === 'NIFTY BANK');
    const midcap    = indices.find((i: any) => i.indexSymbol === 'NIFTY MIDCAP 100');
    const smallcap  = indices.find((i: any) => i.indexSymbol === 'NIFTY SMALLCAP 100');
    const it        = indices.find((i: any) => i.indexSymbol === 'NIFTY IT');
    const pharma    = indices.find((i: any) => i.indexSymbol === 'NIFTY PHARMA');
    const auto      = indices.find((i: any) => i.indexSymbol === 'NIFTY AUTO');
    const fmcg      = indices.find((i: any) => i.indexSymbol === 'NIFTY FMCG');
    const metal     = indices.find((i: any) => i.indexSymbol === 'NIFTY METAL');
    const realty    = indices.find((i: any) => i.indexSymbol === 'NIFTY REALTY');
    const energy    = indices.find((i: any) => i.indexSymbol === 'NIFTY ENERGY');
    const infra     = indices.find((i: any) => i.indexSymbol === 'NIFTY INFRA');

    // Breadth: count advancing vs declining indices
    const allSectors = [nifty, bankNifty, midcap, smallcap, it, pharma, auto, fmcg, metal, realty, energy, infra].filter(Boolean);
    const advances  = allSectors.filter((i: any) => i.percentChange > 0).length;
    const declines  = allSectors.filter((i: any) => i.percentChange < 0).length;
    const unchanged = allSectors.filter((i: any) => i.percentChange === 0).length;

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
    ].filter(s => s.index).map(s => ({
      sector:     s.sector,
      last:       s.index.last,
      change:     s.index.variation,
      changePct:  s.index.percentChange,
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
        total: allSectors.length,
        advanceDeclineRatio: declines > 0 ? parseFloat((advances / declines).toFixed(2)) : advances,
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
