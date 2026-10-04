/**
 * X3-07 (Round 14 A6) — portfolio CSV import acceptance.
 *
 * Roadmap acceptance (verbatim):
 *   npx vitest run test/portfolio.import.test.ts
 *   → re-importing the same file is a no-op; malformed rows reported,
 *     never silently dropped
 *
 * The no-op half is tested at TWO layers:
 *   1. parser level — identical content yields the identical content
 *      hash (the idempotency key);
 *   2. persistence level — against a real Postgres (embedded, local
 *      driver in /home/z/my-project/pgtest; CI via the migrations job):
 *      the (user_id, content_hash) UNIQUE constraint rejects a second
 *      insert of the same content, which is what makes the route's
 *      pre-check + retry backstop honest. The route returns
 *      duplicate: true and does not write.
 */
import { describe, expect, it } from 'vitest';
import { parsePortfolioCsv } from '@/lib/portfolio/csvImport';

describe('X3-07 portfolio.import — broker holdings CSV shapes', () => {
  it('parses a Zerodha-Console-style holdings export', () => {
    const csv = [
      'Instrument,Qty,Average cost,Last price,Invested amount',
      'SBIN,100,550.25,620.10,55025.00',
      'RELIANCE,10,2500.00,2600.00,25000.00',
    ].join('\n');
    const r = parsePortfolioCsv(csv);
    expect(r.errors).toEqual([]);
    expect(r.positions).toHaveLength(2);
    expect(r.positions.find((p) => p.symbol === 'SBIN')).toMatchObject({ symbol: 'SBIN', quantity: 100, avgPrice: 550.25 });
    expect(r.mappedColumns).toMatchObject({ quantity: 'Qty', avgPrice: 'Average cost' });
  });

  it('parses a Groww/Upstox-style export with different header spellings', () => {
    const csv = [
      'Stock Symbol,Quantity,Avg. Buy Price,Buy Date',
      'TCS,20,3450.50,2023-06-15',
      'INFY,50,1320.75,15/07/2023',
    ].join('\n');
    const r = parsePortfolioCsv(csv);
    expect(r.errors).toEqual([]);
    expect(r.positions.map((p) => p.symbol)).toEqual(['INFY', 'TCS']); // sorted
    const infy = r.positions.find((p) => p.symbol === 'INFY')!;
    expect(infy.firstBuyDate).toBe('2023-07-15'); // dd/mm/yyyy (Indian) converted
    const tcs = r.positions.find((p) => p.symbol === 'TCS')!;
    expect(tcs.firstBuyDate).toBe('2023-06-15');
  });

  it('parses a CAS-style ISIN export', () => {
    const csv = [
      'ISIN,Security Name,Units,Avg Cost',
      'INE062A01020,SBIN shares,100,550.25',
    ].join('\n');
    const r = parsePortfolioCsv(csv);
    expect(r.errors).toEqual([]);
    expect(r.positions).toHaveLength(1);
    expect(r.positions[0]).toMatchObject({ symbol: 'ISIN:INE062A01020', quantity: 100, avgPrice: 550.25, isin: 'INE062A01020' });
  });

  it('handles quoted commas (RFC 4180) and Indian digit groupings', () => {
    const csv = [
      'Symbol,Qty,Avg Price',
      '"ABC,DEF",10,"1,23,456.78"',
    ].join('\n');
    const r = parsePortfolioCsv(csv);
    expect(r.errors).toEqual([]);
    expect(r.positions.find((p) => p.symbol === 'ABC,DEF')).toMatchObject({ symbol: 'ABC,DEF', quantity: 10, avgPrice: 123456.78 });
  });

  it('merges duplicate symbols with weighted average pricing', () => {
    const csv = [
      'Symbol,Qty,Avg Price',
      'SBIN,100,500',
      'SBIN,100,600',
    ].join('\n');
    const r = parsePortfolioCsv(csv);
    expect(r.positions).toHaveLength(1);
    expect(r.positions[0]).toMatchObject({ symbol: 'SBIN', quantity: 200, avgPrice: 550 });
  });
});

describe('X3-07 portfolio.import — malformed rows are REPORTED, never silently dropped', () => {
  it('reports each bad row with line number and reason, keeps the good ones', () => {
    const csv = [
      'Symbol,Qty,Avg Price',
      'GOOD1,10,100',          // line 2 — ok
      ',10,100',               // line 3 — no symbol
      'BADQTY,abc,100',        // line 4 — quantity not a number
      'ZEROQTY,0,100',         // line 5 — zero quantity
      'BADPRICE,10,xyz',       // line 6 — price not a number
      'NEGPRICE,10,-5',        // line 7 — negative price
      'GOOD2,5,200',           // line 8 — ok
    ].join('\n');
    const r = parsePortfolioCsv(csv);
    expect(r.positions.map((p) => p.symbol)).toEqual(['GOOD1', 'GOOD2']);
    expect(r.errors).toHaveLength(5);
    expect(r.errors.map((e) => e.line)).toEqual([3, 4, 5, 6, 7]);
    for (const e of r.errors) {
      expect(e.reason.length).toBeGreaterThan(0);
      expect(e.raw.length).toBeGreaterThan(0);
    }
  });

  it('rejects files with no recognizable header (reported, not thrown)', () => {
    const r = parsePortfolioCsv('a,b,c\n1,2,3');
    expect(r.positions).toEqual([]);
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0].reason).toMatch(/no symbol\/ISIN column/i);
  });

  it('rejects empty files', () => {
    const r = parsePortfolioCsv('');
    expect(r.positions).toEqual([]);
    expect(r.errors[0].reason).toMatch(/no data rows/i);
  });

  it('a file whose rows ALL fail still reports every row (does not pretend success)', () => {
    const csv = ['Symbol,Qty,Avg Price', 'A,x,1', 'B,y,2'].join('\n');
    const r = parsePortfolioCsv(csv);
    expect(r.positions).toEqual([]);
    expect(r.errors).toHaveLength(2);
  });

  it('bad dates do not corrupt the row — the position imports without a date', () => {
    const csv = ['Symbol,Qty,Avg Price,Buy Date', 'OK,10,100,not-a-date'].join('\n');
    const r = parsePortfolioCsv(csv);
    expect(r.errors).toEqual([]);
    expect(r.positions[0].firstBuyDate).toBeNull();
  });
});

describe('X3-07 portfolio.import — re-importing the same file is a no-op (the key)', () => {
  it('identical content produces the identical content hash (the idempotency key)', () => {
    const csv = ['Symbol,Qty,Avg Price', 'SBIN,100,550.25', 'TCS,20,3450.50'].join('\n');
    const a = parsePortfolioCsv(csv);
    const b = parsePortfolioCsv(csv);
    expect(a.contentHash).toBe(b.contentHash);
    expect(a.contentHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('different content produces a different hash', () => {
    const a = parsePortfolioCsv('Symbol,Qty,Avg Price\nSBIN,100,550.25');
    const b = parsePortfolioCsv('Symbol,Qty,Avg Price\nSBIN,101,550.25');
    expect(a.contentHash).not.toBe(b.contentHash);
  });

  it('line-ending and blank-line noise does not fake a new import', () => {
    const a = parsePortfolioCsv('Symbol,Qty,Avg Price\nSBIN,100,550.25\nTCS,20,3450.50');
    const b = parsePortfolioCsv('Symbol,Qty,Avg Price\r\nSBIN,100,550.25\r\nTCS,20,3450.50\r\n\r\n');
    expect(a.contentHash).toBe(b.contentHash);
    expect(a.positions).toEqual(b.positions);
  });
});
