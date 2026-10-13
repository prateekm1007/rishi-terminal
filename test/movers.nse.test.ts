/**
 * LIVE-TODAY (founder order, 2026-10-13) — the NSE movers transport pin.
 *
 * Founder: "use Unofficial data scrapers. vsjha18/nsetools (MIT)
 * retrieves data 'from the official website' … marketcalls/openchart
 * (MIT) says it is not affiliated with NSE and uses its APIs." This
 * module calls the same public endpoints; this pin enforces the
 * honesty contract of that transport:
 *
 *   1. the development-egress reality: NSE's Akamai edge serves a 403
 *      HTML body to datacenter IPs (CAPTURED bytes below — the real
 *      response from this repo's sandbox, 2026-10-13). The fetch must
 *      return null (honest miss) with the HTTP status disclosed — the
 *      computed fallback then serves. json() on that body would throw;
 *      a naive parse must never surface rows;
 *   2. a REAL payload shape (the documented nsetools/openchart
 *      contract, legacy + modern field spellings) parses to ranked rows
 *      with sanitized symbols and NSE's own timestamp as observedAt;
 *   3. rows without price or percent change are dropped (cannot rank);
 *   4. BOTH lists (gainers AND losers) or NONE — a half-successful
 *      fetch never serves (Rule 3: two panels from different sources
 *      would be a mixed-provenance lie);
 *   5. the IST payload timestamp parses to ISO; junk parses to null
 *      (never the fetch time).
 *
 * Fail-first (C5): before lib/movers/nse existed every leg failed on
 * the missing module; the 403-body leg was tightened by feeding the
 * captured bytes through a json()-style stub (which throws) — the
 * module must catch and return the honest null.
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

function res(status: number, body: string): Response {
  return new Response(body, {
    status,
    headers: { "Content-Type": status === 200 ? "application/json" : "text/html" },
  });
}

/// A realistic payload per the documented contract (legacy spellings).
function gainersPayload(): string {
  return JSON.stringify({
    data: [
      { symbol: "RELIANCE", series: "EQ", open_price: 1180, high_price: 1225, low_price: 1175, ltp: 1218.5, prev_price: 1180.1, netPrice: 38.4, pChange: 3.25, totalTradedVolume: 12_345_678 },
      { symbol: "TCS", series: "EQ", open_price: 3750, high_price: 3900, low_price: 3745, ltp: 3895.2, prev_price: 3760.0, netPrice: 135.2, pChange: 3.6, totalTradedVolume: 2_345_678 },
      { symbol: "WEIRD-BOX", ltp: 100, pChange: 2.0 },          // sanitized-charset survivor
      { symbol: "NOCHANGE", ltp: 500, netPrice: 0 },             // no pct → dropped
      { symbol: "NOPRICE", pChange: 5.0 },                       // no price → dropped
      { symbol: "bad symbol!", ltp: 100, pChange: 1.0 },         // unsanitizable → dropped
    ],
    timestamp: "13-Oct-2026 15:45:31",
  });
}

/// The same shape with modern spellings (lastPrice / perChange).
function losersPayload(): string {
  return JSON.stringify({
    data: [
      { symbol: "BANKBARODA", lastPrice: 248.3, change: -11.7, perChange: -4.5, totalTradedVolume: 9_876_543 },
      { symbol: "PNB", lastPrice: 100.2, change: -3.1, perChange: -3.0 },
    ],
    timestamp: "13-Oct-2026 15:45:31",
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

describe("LIVE-TODAY — fetchNseMovers (the honest transport)", () => {
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

  it("a real payload (legacy spellings) parses to ranked, sanitized, source-stamped rows", async () => {
    const doFetch = vi.fn(async (url: string) =>
      res(200, url.includes("gainers") ? gainersPayload() : losersPayload()),
    );
    const { result, error } = await fetchNseMovers(5, doFetch as never);
    expect(error).toBeNull();
    expect(result).not.toBeNull();
    // drop rules held: NOCHANGE (no pct), NOPRICE (no price), "bad symbol!" all gone
    expect(result!.gainers.map((r) => r.symbol)).toEqual(["RELIANCE", "TCS", "WEIRD-BOX"]);
    expect(result!.losers.map((r) => r.symbol)).toEqual(["BANKBARODA", "PNB"]);
    // ranks in the payload's own order
    expect(result!.gainers[0].rank).toBe(1);
    // provenance: NSE transport id + NSE's own timestamp as ISO
    expect(result!.gainers[0].source).toBe("nse-movers");
    expect(result!.gainers[0].observedAt).toBe("2026-10-13T10:15:31.000Z");
    // legacy pct spelling read as percent; ₹ move (netPrice) NOT read as pct
    expect(result!.gainers[0].changePct).toBe(3.25);
    expect(result!.losers[0].changePct).toBe(-4.5); // modern perChange spelling
    // volume carried when disclosed, null when not
    expect(result!.gainers[0].volume).toBe(12_345_678);
    expect(result!.losers[1].volume).toBeNull();
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

  it("an empty data array is an honest miss, not an empty success", async () => {
    const doFetch = vi.fn(async () => res(200, JSON.stringify({ data: [] })));
    const { result } = await fetchNseMovers(5, doFetch as never);
    expect(result).toBeNull();
  });
});
