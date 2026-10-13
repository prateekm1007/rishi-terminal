/**
 * LIVE-TODAY / NSEPERM (founder orders, 2026-10-13/14) — the NSE movers
 * transport pin.
 *
 * Founder (13 Oct): "use Unofficial data scrapers. vsjha18/nsetools (MIT)
 * retrieves data 'from the official website' … marketcalls/openchart
 * (MIT) says it is not affiliated with NSE and uses its APIs."
 * Founder (14 Oct): "now that we have permission" — NSE market data use
 * is formally licensed (letter ref NSE/MD/DATA/PERM/2026/0847,
 * 13 Oct 2026; docs/evidence/round57/). This module calls the same
 * public endpoints the MIT scrapers document; this pin enforces the
 * honesty contract of that transport:
 *
 *   1. the development-egress reality: NSE's Akamai edge serves a 403
 *      HTML body to datacenter IPs (CAPTURED bytes below — the real
 *      response from this repo's sandbox, 2026-10-13). The fetch must
 *      return null (honest miss) with the HTTP status disclosed — the
 *      computed fallback then serves. json() on that body would throw;
 *      a naive parse must never surface rows;
 *   2. the REAL payload contract (nsetools master, src/nsetools/nse.py
 *      + urls.py, MIT — read as documentation, nothing vendored; plus
 *      the production capture in docs/evidence/round56/r56-live-today.md):
 *        GET /api/live-analysis-variations?index=gainers  → gainers
 *        GET /api/live-analysis-variations?index=loosers  → losers
 *          (NSE's own 'loosers' spelling; the correctly-spelled
 *          'losers' returns {"data":"Missing index or key."} with HTTP
 *          200 — captured from production egress 2026-10-13);
 *        payload = { legends: [[key, label], …],
 *                    <KEY>: { data: [rows…] }, … }
 *        nsetools reads res.json()[index]['data'] with index in
 *        {NIFTY, BANKNIFTY, NIFTYNEXT50, SecGtr20, SecLwr20, FNO, ALL};
 *        numeric fields arrive as STRINGS (nsetools ships a recursive
 *        string→number caster for exactly this reason — the row schema
 *        must coerce, never assume JSON numbers);
 *   3. universe preference: ALL (market-wide — the same scope the
 *      computed fallback ranks) before NIFTY (the headline 50); the
 *      universe that served is returned for disclosure;
 *   4. rows without price or percent change are dropped (cannot rank);
 *   5. BOTH lists (gainers AND losers) or NONE — a half-successful
 *      fetch never serves (Rule 3: two panels from different sources
 *      would be a mixed-provenance lie);
 *   6. the IST payload timestamp parses to ISO; junk parses to null
 *      (never the fetch time).
 *
 * Fail-first (C5): the round-56 schema (top-level `data` array +
 * `index=losers`) was written before the contract above was extracted —
 * the legends-keyed legs and the loosers-URL pin failed against it
 * (exactly the production failure the round-56 warm response disclosed),
 * then passed with the nse.ts fix.
 */
import { describe, expect, it, vi } from "vitest";
import {
  fetchNseMovers,
  parseNseTimestamp,
  sanitizeNseSymbol,
} from "../lib/movers/nse";

/// The CAPTURED Akamai 403 body (verbatim bytes, 2026-10-13, dev egress).
const CAPTURED_403_BODY = `<HTML><HEAD>
<TITLE>Access Denied</TITLE>
</HEAD><BODY>
<H1>Access Denied</H1>
 
You don't have permission to access "http&#58;&#47;&#47;www&#46;nseindia&#46;com&#47;api&#47;live&#45;analysis&#45;variations&#63;" on this server.<P>
Reference&#32;&#35;18&#46;c5b92117&#46;1791899303&#46;8a23860
<P>https&#58;&#47;&#47;errors&#46;edgesuite&#46;net&#47;18&#46;c5b92117&#46;1791899303&#46;8a23860</P>
</BODY>
</HTML>`;

/// The CAPTURED misspelled-direction body (production egress, 2026-10-13:
/// `index=losers` → HTTP 200 with this error payload — the reason the
/// round-56 losers list never served from NSE).
const CAPTURED_MISSING_INDEX_BODY = `{"data":"Missing index or key."}`;

function res(status: number, body: string): Response {
  return new Response(body, {
    status,
    headers: { "Content-Type": status === 200 ? "application/json" : "text/html" },
  });
}

/// The legends-keyed gainers payload per the documented contract. The
/// ALL universe carries the market-wide list (numeric STRINGS with
/// Indian digit grouping — the nsetools cast helper's raison d'être);
/// NIFTY carries a shorter list that must NOT serve while ALL exists.
function gainersPayload(): string {
  return JSON.stringify({
    legends: [
      ["NIFTY", "NIFTY 50"],
      ["BANKNIFTY", "NIFTY BANK"],
      ["SecGtr20", "Securities greater than 20"],
      ["SecLwr20", "Securities lower than 20"],
      ["FNO", "Futures & Options"],
      ["ALL", "All Securities"],
    ],
    NIFTY: {
      data: [
        { symbol: "TCS", series: "EQ", open_price: 3750, high_price: 3900, low_price: 3745, ltp: 3895.2, prev_price: 3760.0, net_price: 135.2, perChange: 3.6, trade_quantity: 2_345_678 },
      ],
    },
    ALL: {
      data: [
        { symbol: "RELIANCE", series: "EQ", open_price: "1,180.00", high_price: "1,225.00", low_price: "1,175.00", ltp: "1,218.50", prev_price: "1,180.10", net_price: "38.40", perChange: "3.25", trade_quantity: "12,345,678" },
        { symbol: "TCS", series: "EQ", open_price: 3750, high_price: 3900, low_price: 3745, ltp: 3895.2, prev_price: 3760.0, net_price: 135.2, perChange: 3.6, trade_quantity: 2_345_678 },
        { symbol: "WEIRD-BOX", ltp: 100, perChange: 2.0 },          // sanitized-charset survivor
        { symbol: "NOCHANGE", ltp: 500, net_price: 0 },              // no pct → dropped
        { symbol: "NOPRICE", perChange: 5.0 },                       // no price → dropped
        { symbol: "bad symbol!", ltp: 100, perChange: 1.0 },         // unsanitizable → dropped
      ],
      timestamp: "13-Oct-2026 15:45:31",
    },
  });
}

/// The losers direction: same legends-keyed shape, modern field
/// spellings (lastPrice / perChange / totalTradedVolume).
function losersPayload(): string {
  return JSON.stringify({
    legends: [["NIFTY", "NIFTY 50"], ["ALL", "All Securities"]],
    ALL: {
      data: [
        { symbol: "BANKBARODA", lastPrice: 248.3, change: -11.7, perChange: -4.5, totalTradedVolume: 9_876_543 },
        { symbol: "PNB", lastPrice: 100.2, change: -3.1, perChange: -3.0 },
      ],
      timestamp: "13-Oct-2026 15:45:31",
    },
  });
}

/// The NIFTY-only shape (no ALL key): the headline-50 universe serves.
function niftyOnlyPayload(): string {
  return JSON.stringify({
    legends: [["NIFTY", "NIFTY 50"]],
    NIFTY: {
      data: [
        { symbol: "INFY", ltp: 1600.5, perChange: 1.2, trade_quantity: 1_111_111 },
      ],
      timestamp: "13-Oct-2026 15:45:31",
    },
  });
}

describe("LIVE-TODAY — sanitizeNseSymbol (Rule 9: upstream text is untrusted)", () => {
  it("accepts real NSE tickers and rejects everything else", () => {
    expect(sanitizeNseSymbol(" reliance ")).toBe("RELIANCE");
    expect(sanitizeNseSymbol("M&M")).toBe("M&M");
    expect(sanitizeNseSymbol("BAJAJ-AUTO")).toBe("BAJAJ-AUTO");
    expect(sanitizeNseSymbol("bad symbol!")).toBeNull();
    expect(sanitizeNseSymbol("")).toBeNull();
    expect(sanitizeNseSymbol("X".repeat(21))).toBeNull();
    expect(sanitizeNseSymbol("INR; DROP TABLE")).toBeNull();
  });
});

describe("LIVE-TODAY — parseNseTimestamp (NSE's own IST clock, never the fetch time)", () => {
  it("parses the documented IST format to ISO", () => {
    expect(parseNseTimestamp("13-Oct-2026 15:45:31")).toBe("2026-10-13T10:15:31.000Z"); // 15:45:31 IST = 10:15:31 UTC
  });
  it("junk and absence parse to null — never a fabricated time", () => {
    expect(parseNseTimestamp(undefined)).toBeNull();
    expect(parseNseTimestamp("")).toBeNull();
    expect(parseNseTimestamp("yesterday")).toBeNull();
    expect(parseNseTimestamp("13-XXX-2026 15:45:31")).toBeNull();
  });
});

describe("NSEPERM — fetchNseMovers (the honest, contract-correct transport)", () => {
  it("the CAPTURED Akamai 403 body is an honest miss: null result, status disclosed", async () => {
    const doFetch = vi.fn(async () => res(403, CAPTURED_403_BODY));
    const { result, error } = await fetchNseMovers(5, doFetch as never);
    expect(result).toBeNull();
    expect(error).toContain("HTTP 403");
  });

  it("a 200 with an unparseable body is an honest miss with the issue disclosed", async () => {
    const doFetch = vi.fn(async () => res(200, "<html>not json</html>"));
    const { result, error } = await fetchNseMovers(5, doFetch as never);
    expect(result).toBeNull();
    expect(error).toBeTruthy();
  });

  it("the losers list is requested with NSE's own 'loosers' spelling (the round-56 production miss)", async () => {
    const urls: string[] = [];
    const doFetch = vi.fn(async (url: string) => {
      urls.push(url);
      return res(200, url.includes("gainers") ? gainersPayload() : losersPayload());
    });
    await fetchNseMovers(5, doFetch as never);
    expect(urls.some((u) => u.includes("index=loosers"))).toBe(true);
    expect(urls.some((u) => u.includes("index=losers") && !u.includes("loosers"))).toBe(false);
  });

  it("a real legends-keyed payload parses to ranked, sanitized, source-stamped rows — ALL universe preferred, string numbers coerced", async () => {
    const doFetch = vi.fn(async (url: string) =>
      res(200, url.includes("gainers") ? gainersPayload() : losersPayload()),
    );
    const { result, error } = await fetchNseMovers(5, doFetch as never);
    expect(error).toBeNull();
    expect(result).not.toBeNull();
    // the ALL universe served (not NIFTY's shorter list — scope parity
    // with the computed fallback's market-wide ranking)
    expect(result!.universe).toBe("ALL");
    // drop rules held: NOCHANGE (no pct), NOPRICE (no price), "bad symbol!" all gone
    expect(result!.gainers.map((r) => r.symbol)).toEqual(["RELIANCE", "TCS", "WEIRD-BOX"]);
    expect(result!.losers.map((r) => r.symbol)).toEqual(["BANKBARODA", "PNB"]);
    // ranks in the payload's own order
    expect(result!.gainers[0].rank).toBe(1);
    // provenance: NSE transport id + NSE's own timestamp as ISO
    expect(result!.gainers[0].source).toBe("nse-movers");
    expect(result!.gainers[0].observedAt).toBe("2026-10-13T10:15:31.000Z");
    // numeric STRINGS (with Indian digit grouping) coerced — the nsetools cast contract
    expect(result!.gainers[0].price).toBe(1218.5);
    expect(result!.gainers[0].changePct).toBe(3.25);
    expect(result!.gainers[0].volume).toBe(12_345_678);
    // legacy perChange and modern perChange both read as percent;
    // the ₹ move (net_price/change) is NOT read as pct
    expect(result!.gainers[1].changePct).toBe(3.6);
    expect(result!.losers[0].changePct).toBe(-4.5);
    // trade_quantity and totalTradedVolume both carried; null when absent
    expect(result!.losers[0].volume).toBe(9_876_543);
    expect(result!.losers[1].volume).toBeNull();
  });

  it("a payload without ALL falls back to the NIFTY universe, disclosed", async () => {
    const doFetch = vi.fn(async () => res(200, niftyOnlyPayload()));
    const { result, error } = await fetchNseMovers(5, doFetch as never);
    expect(error).toBeNull();
    expect(result).not.toBeNull();
    expect(result!.universe).toBe("NIFTY");
    expect(result!.gainers.map((r) => r.symbol)).toEqual(["INFY"]);
  });

  it("the CAPTURED misspelled-direction body is an honest miss with the payload head disclosed", async () => {
    const doFetch = vi.fn(async () => res(200, CAPTURED_MISSING_INDEX_BODY));
    const { result, error } = await fetchNseMovers(5, doFetch as never);
    expect(result).toBeNull();
    expect(error).toContain("Missing index or key");
  });

  it("BOTH lists or NONE — a gainers success with a losers failure serves nothing", async () => {
    const doFetch = vi.fn(async (url: string) =>
      url.includes("gainers")
        ? res(200, gainersPayload())
        : res(403, CAPTURED_403_BODY),
    );
    const { result } = await fetchNseMovers(5, doFetch as never);
    expect(result).toBeNull();
  });

  it("an empty universe data array is an honest miss, not an empty success", async () => {
    const doFetch = vi.fn(async () =>
      res(200, JSON.stringify({ legends: [["NIFTY", "NIFTY 50"]], NIFTY: { data: [] } })),
    );
    const { result } = await fetchNseMovers(5, doFetch as never);
    expect(result).toBeNull();
  });

  it("the old top-level-data shape (the round-56 wrong contract) is an honest miss, never rows", async () => {
    const doFetch = vi.fn(async () => res(200, JSON.stringify({ data: [] })));
    const { result } = await fetchNseMovers(5, doFetch as never);
    expect(result).toBeNull();
  });
});
