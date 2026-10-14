// test/niftyConstituents.nse.test.ts — TODAY-NIFTY (founder order,
// 2026-10-14: "expand the candidate set toward the licensed Nifty 50"):
// the NSE index-constituents transport pin.
//
// The verdicts candidate set derives from NSE's OWN Nifty-50 constituent
// list — the endpoint the MIT scrapers document for index constituents
// (marketcalls/openchart's quotes-by-index; the same domain + header
// profile the movers transport already uses from the production egress,
// and the same licence covers it — letter ref
// NSE/MD/DATA/PERM/2026/0847 covers all nseindia.com/api/ quote and
// index endpoints):
//
//   GET /api/equity-stockIndices?index=NIFTY%2050
//     payload = { timestamp: "14-Oct-2026 12:10:30",
//                data: [ { symbol: "NIFTY 50", priority: 1, …index row… },
//                        { symbol: "RELIANCE", series: "EQ", ltp… },
//                        … ~50 constituent rows … ] }
//
// Honesty contract (the movers.nse class):
//   - the sandbox egress reality: Akamai 403 HTML → null (the captured
//     bytes below are the same class the movers transport pinned);
//   - the payload is zod-parsed BEFORE any field is read; a mismatch or
//     an empty data array → null (fail-closed, never partial);
//   - symbols are sanitized (Rule 9) — the index row "NIFTY 50" carries
//     a space and is dropped BY THE SANITIZER, not by a name blacklist;
//   - the list is deduped and returned in deterministic (sorted) order;
//   - NSE's own timestamp parses to ISO or null — never the fetch time.
//
// The sandbox cannot verify the live payload (the 403 is an egress
// property, not a code property) — the production warmer's disclosure
// carries the live proof after deploy (the round-56/57 pattern), with
// the founder-five fallback behind a schema drift.

import { describe, expect, it, vi } from "vitest";
import { fetchNiftyConstituents } from "../lib/movers/nse";

/// The CAPTURED Akamai 403 body class (the movers transport's verbatim
/// capture, 2026-10-13, dev egress — the same edge serves this endpoint).
const CAPTURED_403_BODY = `<HTML><HEAD>
<TITLE>Access Denied</TITLE>
</HEAD><BODY>
<H1>Access Denied</H1>
 
You don't have permission to access "http&#58;&#47;&#47www&#46;nseindia&#46;com&#47;api&#47;equity-stockIndices&#63;" on this server.<P>
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

/// The documented constituent payload shape: the index row first
/// (symbol "NIFTY 50" — space, priority 1), then EQ rows with quote
/// fields the constituent reader does NOT need (passthrough).
function constituentsPayload(): string {
  const symbols = [
    "NIFTY 50", "RELIANCE", "TCS", "INFY", "ITC", "HDFCBANK", "SBIN", "ICICIBANK",
    "KOTAKBANK", "AXISBANK", "LT", "BHARTIARTL", "HINDUNILVR", "MARUTI", "SUNPHARMA",
    "TATAMOTORS", "TATASTEEL", "WIPRO", "TECHM", "HCLTECH", "NTPC", "POWERGRID",
    "ONGC", "COALINDIA", "NESTLEIND", "BRITANNIA", "CIPLA", "DRREDDY", "DIVISLAB",
    "APOLLOHOSP", "EICHERMOT", "HEROMOTOCO", "BAJAJ-AUTO", "BAJFINANCE", "BAJAJFINSV",
    "ASIANPAINT", "ULTRACEMCO", "GRASIM", "HINDALCO", "JSWSTEEL", "TATACONSUM",
    "ADANIENT", "ADANIPORTS", "BEL", "JIOFIN", "SHRIRAMFIN", "TRENT", "M&M", "SBILIFE",
    "HDFCLIFE", "JSWENERGY",
  ];
  return JSON.stringify({
    timestamp: "14-Oct-2026 12:10:30",
    data: symbols.map((s, i) => ({
      symbol: s,
      series: s.includes(" ") ? undefined : "EQ",
      priority: s.includes(" ") ? 1 : undefined,
      open: "1000.00",
      dayHigh: "1010.00",
      dayLow: "995.00",
      lastPrice: String(1000 + i),
      previousClose: "999.00",
      pChange: "0.35",
      totalTradedVolume: "1,234,567",
    })),
  });
}

describe("TODAY-NIFTY — fetchNiftyConstituents (the licensed universe source)", () => {
  it("the documented payload parses to a sanitized, deduped, SORTED symbol list — the index row dropped BY THE SANITIZER (space), NSE's own timestamp as ISO", async () => {
    const doFetch = vi.fn(async () => res(200, constituentsPayload()));
    const out = await fetchNiftyConstituents(doFetch as never);
    expect(out).not.toBeNull();
    expect(out!.symbols).toEqual([...out!.symbols].sort());
    expect(out!.symbols).not.toContain("NIFTY 50");
    expect(out!.symbols).toContain("BAJAJ-AUTO"); // the charset survivor class
    expect(out!.symbols).toContain("M&M");
    expect(out!.symbols.length).toBe(50);
    expect(out!.observedAt).toBe("2026-10-14T06:40:30.000Z"); // 12:10:30 IST
  });

  it("the URL carries NSE's own index spelling (NIFTY%2050) and the same header profile + no-store the movers transport uses", async () => {
    const urls: Array<[string, RequestInit | undefined]> = [];
    const doFetch = vi.fn(async (url: string, init?: RequestInit) => {
      urls.push([url, init]);
      return res(200, constituentsPayload());
    });
    await fetchNiftyConstituents(doFetch as never);
    expect(urls.length).toBe(1);
    expect(urls[0][0]).toBe("https://www.nseindia.com/api/equity-stockIndices?index=NIFTY%2050");
    expect(urls[0][1]?.cache).toBe("no-store");
    const headers = urls[0][1]?.headers as Record<string, string>;
    expect(headers.Referer).toBe("https://www.nseindia.com/");
  });

  it("the CAPTURED Akamai 403 class is an honest null (the egress reality, disclosed upstream)", async () => {
    const doFetch = vi.fn(async () => res(403, CAPTURED_403_BODY));
    expect(await fetchNiftyConstituents(doFetch as never)).toBeNull();
  });

  it("an unparseable body, an error payload, or an empty data array is an honest null — never a partial list", async () => {
    expect(await fetchNiftyConstituents(vi.fn(async () => res(200, "<html>nope</html>")) as never)).toBeNull();
    expect(
      await fetchNiftyConstituents(vi.fn(async () => res(200, `{"data":"Missing index or key."}`)) as never),
    ).toBeNull();
    expect(
      await fetchNiftyConstituents(vi.fn(async () => res(200, `{"data":[]}`)) as never),
    ).toBeNull();
  });

  it("a transport throw is an honest null, never a crash into the warm tick", async () => {
    const doFetch = vi.fn(async () => {
      throw new Error("network gone");
    });
    expect(await fetchNiftyConstituents(doFetch as never)).toBeNull();
  });
});
