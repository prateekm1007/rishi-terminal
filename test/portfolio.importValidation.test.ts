/**
 * B2 (founder Round-15) — portfolio import safety acceptance.
 *
 * Founder directives, verbatim:
 *   - "Validate imported symbols against the ticker registry/aliases.
 *      Unknown symbols are reported, never silently stored."
 *   - "Reject any symbol starting with =, +, -, @, tab or CR."
 *   - "Flag future-dated buys as errors, and flag dates before 1990."
 *
 * Acceptance: tests for the formula-leading symbol, a future date, an
 * unknown symbol and a Unicode-lookalike symbol — each written to fail
 * first (Constitution 21/24; the pre-fix run is pasted in the PR).
 *
 * Registry semantics (documented design choice, visible in the response):
 *   - known symbol     -> stored under the CANONICAL symbol (aliases and
 *     mangled-ampersand forms resolve; "saved as typed" was the defect);
 *   - unknown symbol   -> stored (the user's broker data is theirs) but
 *     REPORTED in `warnings` and flagged `knownSymbol: false` — never
 *     silently stored;
 *   - formula-leading / non-ASCII lookalike / bad-ISIN / future or
 *     pre-1990 dates -> row ERRORS (rejected, reported with the line).
 */
import { describe, expect, it } from 'vitest';
import { parsePortfolioCsv } from '@/lib/portfolio/csvImport';

const UNIVERSE = ['SBIN', 'RELIANCE', 'TCS', 'INFY', 'LTIM', 'M&M'];
/** Fixed validation clock — the date rules must not depend on the wall clock in tests. */
const TODAY = '2026-10-04';

describe('B2 portfolio.import — formula-injection guard (reject)', () => {
  it('rejects a symbol starting with "=" (the classic =cmd|... CSV injection)', () => {
    const csv = ["Symbol,Qty,Avg Price", "=cmd|' /C calc'!A0,10,100"].join('\n');
    const r = parsePortfolioCsv(csv, { universe: UNIVERSE, today: TODAY });
    expect(r.positions.map((p) => p.symbol)).toEqual([]);
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0].line).toBe(2);
    expect(r.errors[0].reason).toMatch(/formula|injection|=|\+/i);
  });

  it.each(['+PAD_ENTRY', '-2HACKS', '@SUM(X)', '\tTABSYMBOL', '\rCRSYMBOL'])(
    'rejects a symbol starting with %j',
    (symbol) => {
      const csv = ['Symbol,Qty,Avg Price', `${symbol},10,100`].join('\n');
      const r = parsePortfolioCsv(csv, { universe: UNIVERSE, today: TODAY });
      expect(r.positions).toEqual([]);
      expect(r.errors).toHaveLength(1);
      expect(r.errors[0].reason).toMatch(/formula|injection/i);
    },
  );
});

describe('B2 portfolio.import — Unicode-lookalike guard (reject)', () => {
  it('rejects a fullwidth lookalike symbol (ＩＮＦＹ looks like INFY)', () => {
    const csv = ['Symbol,Qty,Avg Price', 'ＩＮＦＹ,10,1320'].join('\n');
    const r = parsePortfolioCsv(csv, { universe: UNIVERSE, today: TODAY });
    expect(r.positions).toEqual([]);
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0].reason).toMatch(/plain ASCII|lookalike|charset/i);
  });

  it('rejects a Cyrillic-homoglyph symbol (ІNFY — І is U+0406, not I)', () => {
    const csv = ['Symbol,Qty,Avg Price', 'ІNFY,10,1320'].join('\n');
    const r = parsePortfolioCsv(csv, { universe: UNIVERSE, today: TODAY });
    expect(r.positions).toEqual([]);
    expect(r.errors).toHaveLength(1);
  });

  it('rejects a symbol with a comma (charset violation; the pre-B2 parser accepted "ABC,DEF")', () => {
    const csv = ['Symbol,Qty,Avg Price', '"ABC,DEF",10,"1,23,456.78"'].join('\n');
    const r = parsePortfolioCsv(csv, { universe: UNIVERSE, today: TODAY });
    expect(r.positions).toEqual([]);
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0].reason).toMatch(/plain ASCII|lookalike|charset|symbol/i);
  });
});

describe('B2 portfolio.import — date sanity (reject)', () => {
  it('flags a future-dated buy as an ERROR (2099-01-01 was silently imported)', () => {
    const csv = ['Symbol,Qty,Avg Price,Buy Date', 'INFY,50,1320.75,2099-01-01'].join('\n');
    const r = parsePortfolioCsv(csv, { universe: UNIVERSE, today: TODAY });
    expect(r.positions).toEqual([]);
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0].line).toBe(2);
    expect(r.errors[0].reason).toMatch(/future/i);
  });

  it('flags a buy date before 1990 as an ERROR', () => {
    const csv = ['Symbol,Qty,Avg Price,Buy Date', 'SBIN,10,100,1899-05-01'].join('\n');
    const r = parsePortfolioCsv(csv, { universe: UNIVERSE, today: TODAY });
    expect(r.positions).toEqual([]);
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0].reason).toMatch(/1990/i);
  });

  it('a buy dated yesterday imports (control — the guards are not over-broad)', () => {
    const csv = ['Symbol,Qty,Avg Price,Buy Date', 'SBIN,10,100,2026-10-03'].join('\n');
    const r = parsePortfolioCsv(csv, { universe: UNIVERSE, today: TODAY });
    expect(r.errors).toEqual([]);
    expect(r.positions[0].firstBuyDate).toBe('2026-10-03');
  });

  it('uses the wall clock when no today is injected (future still rejected)', () => {
    const csv = ['Symbol,Qty,Avg Price,Buy Date', 'SBIN,10,100,2099-01-01'].join('\n');
    const r = parsePortfolioCsv(csv, { universe: UNIVERSE });
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0].reason).toMatch(/future/i);
  });
});

describe('B2 portfolio.import — registry validation (report, never silently store)', () => {
  it('an unknown symbol is imported but REPORTED and flagged knownSymbol:false', () => {
    const csv = ['Symbol,Qty,Avg Price', 'NOTAREALSYM,10,100'].join('\n');
    const r = parsePortfolioCsv(csv, { universe: UNIVERSE, today: TODAY });
    expect(r.errors).toEqual([]);
    expect(r.positions).toHaveLength(1);
    expect(r.positions[0].knownSymbol).toBe(false);
    expect(r.warnings).toHaveLength(1);
    expect(r.warnings[0]).toMatchObject({ line: 2, symbol: 'NOTAREALSYM' });
    expect(r.warnings[0].reason).toMatch(/registry|unknown|not/i);
  });

  it('a known symbol imports as known, with no warnings', () => {
    const csv = ['Symbol,Qty,Avg Price', 'SBIN,100,550.25'].join('\n');
    const r = parsePortfolioCsv(csv, { universe: UNIVERSE, today: TODAY });
    expect(r.warnings).toEqual([]);
    expect(r.positions[0]).toMatchObject({ symbol: 'SBIN', knownSymbol: true });
  });

  it('a renamed symbol resolves to its canonical form (MINDTREE -> LTIM; "saved as typed" was the defect)', () => {
    const csv = ['Symbol,Qty,Avg Price', 'MINDTREE,10,4000'].join('\n');
    const r = parsePortfolioCsv(csv, { universe: UNIVERSE, today: TODAY });
    expect(r.errors).toEqual([]);
    expect(r.positions).toHaveLength(1);
    expect(r.positions[0]).toMatchObject({ symbol: 'LTIM', knownSymbol: true });
    expect(r.warnings).toHaveLength(1);
    expect(r.warnings[0].reason).toMatch(/alias|resolved|rename/i);
  });

  it('a mangled-ampersand form resolves (MANDM -> M&M)', () => {
    const csv = ['Symbol,Qty,Avg Price', 'MANDM,10,2900'].join('\n');
    const r = parsePortfolioCsv(csv, { universe: UNIVERSE, today: TODAY });
    expect(r.positions[0]).toMatchObject({ symbol: 'M&M', knownSymbol: true });
  });

  it('without a universe, no registry claim is made (knownSymbol stays null, no warnings)', () => {
    const csv = ['Symbol,Qty,Avg Price', 'WHATEVER,10,100'].join('\n');
    const r = parsePortfolioCsv(csv);
    expect(r.warnings).toEqual([]);
    expect(r.positions[0].knownSymbol).toBeNull();
  });
});

describe('B2 portfolio.import — ISIN shape (reject garbage, keep valid CAS rows)', () => {
  it('rejects a malformed ISIN in a CAS row', () => {
    const csv = ['ISIN,Units,Avg Cost', 'NOTANISINATALL,100,550.25'].join('\n');
    const r = parsePortfolioCsv(csv, { universe: UNIVERSE, today: TODAY });
    expect(r.positions).toEqual([]);
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0].reason).toMatch(/ISIN/i);
  });

  it('a valid CAS ISIN row still imports (control)', () => {
    const csv = ['ISIN,Units,Avg Cost', 'INE062A01020,100,550.25'].join('\n');
    const r = parsePortfolioCsv(csv, { universe: UNIVERSE, today: TODAY });
    expect(r.errors).toEqual([]);
    expect(r.positions).toHaveLength(1);
    expect(r.positions[0].symbol).toBe('ISIN:INE062A01020');
  });
});
