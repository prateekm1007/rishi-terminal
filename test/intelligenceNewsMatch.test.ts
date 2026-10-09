/**
 * INT-B1 — per-symbol news evidence (roadmap item B1): the deterministic
 * symbol-match, the content-derived stable evidence id, and the caps.
 *
 * Pre-registration: docs/intelligence/newsEvidence.md (committed BEFORE
 * any evaluation). Rule 21 fail-first: on the pre-module tree this file
 * fails at import (modules missing) — the A3..A10 precedent.
 */
import { describe, expect, it, vi, afterEach } from "vitest";

import { matchNewsForSymbol, stableNewsIdOf } from "@/lib/intelligence/newsMatch";
import { buildNewsEvidenceDeps } from "@/lib/intelligence/newsEvidence";

const ITEM = (over: Record<string, unknown> = {}) => ({
  id: "feed-1-0-1700000000000",
  headline: "Markets rally as banks gain",
  summary: "Broad market strength across the session.",
  source: "RSS Feed",
  category: "MARKET",
  subCategory: "",
  time: "10:00 IST",
  minutesAgo: 30,
  impact: "NEUTRAL" as const,
  tags: [],
  isBreaking: false,
  isTrending: false,
  region: "INDIA" as const,
  url: "https://example.com/a",
  pubDate: "2026-10-09T05:30:00.000Z",
  ...over,
});

describe("INT-B1 closed rules (deterministic, fail-closed)", () => {
  it("matches the registry symbol token on a word boundary in headline/summary/tags", () => {
    const items = [
      ITEM({ headline: "RELIANCE Industries announces capex plan" }),
      ITEM({ headline: "Banking stocks rally", summary: "No names here.", tags: ["markets"] }),
    ];
    const out = matchNewsForSymbol("RELIANCE", "Reliance Industries", items as never);
    expect(out).toHaveLength(1);
    expect(out[0]?.headline).toContain("RELIANCE");
  });

  it("matches the exact company name case-insensitively", () => {
    const items = [ITEM({ summary: "Analysts weigh reliance industries capex outlook" })];
    const out = matchNewsForSymbol("RELIANCE", "Reliance Industries", items as never);
    expect(out).toHaveLength(1);
  });

  it("NEVER matches partial tokens or stems (no invented semantics)", () => {
    const items = [ITEM({ headline: "Irreliable data unreliable inferences" })];
    const out = matchNewsForSymbol("RELIANCE", "Reliance Industries", items as never);
    expect(out).toHaveLength(0);
  });

  it("an item matching MANY symbols is attributed to each (verbatim text)", () => {
    const items = [ITEM({ headline: "RELIANCE and TCS announce joint venture" })];
    const a = matchNewsForSymbol("RELIANCE", "Reliance Industries", items as never);
    const b = matchNewsForSymbol("TCS", "Tata Consultancy Services", items as never);
    expect(a).toHaveLength(1);
    expect(b).toHaveLength(1);
  });

  it("zero matches is an empty list (the honest unavailable state)", () => {
    const out = matchNewsForSymbol("RELIANCE", "Reliance Industries", [ITEM()] as never);
    expect(out).toHaveLength(0);
  });

  it("items with an empty source or headline are refused from matching", () => {
    const out = matchNewsForSymbol("RELIANCE", "Reliance Industries", [
      ITEM({ source: "", headline: "RELIANCE capex" }),
      ITEM({ source: "RSS", headline: "" }),
    ] as never);
    expect(out).toHaveLength(0);
  });

  it("caps at 8 items ordered pubDate desc with stable-id asc tie-break", () => {
    const many = Array.from({ length: 12 }, (_, i) =>
      ITEM({
        headline: `RELIANCE update ${i}`,
        url: `https://example.com/${i}`,
        pubDate: new Date(Date.parse("2026-10-09T00:00:00.000Z") + i * 60_000).toISOString(),
      }),
    );
    const out = matchNewsForSymbol("RELIANCE", "Reliance Industries", many as never);
    expect(out).toHaveLength(8);
    const dates = out.map((x) => Date.parse(x.pubDate));
    expect([...dates].sort((a, b) => b - a)).toEqual(dates);
  });

  it("the stable evidence id is content-derived and deterministic (the pipeline id is time-seeded and NOT identity-bearing)", () => {
    const a = stableNewsIdOf(ITEM({ id: "feed-1-0-999" }) as never);
    const b = stableNewsIdOf(ITEM({ id: "feed-2-7-111" }) as never);
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    const moved = stableNewsIdOf(ITEM({ url: "https://example.com/other" }) as never);
    expect(moved).not.toBe(a);
  });

  it("the stable id keeps the headline in the identity (a '#' link never collapses distinct headlines)", () => {
    const a = stableNewsIdOf(ITEM({ url: "#" }) as never);
    const b = stableNewsIdOf(ITEM({ url: "#", headline: "A different headline entirely" }) as never);
    expect(a).not.toBe(b);
  });
});

describe("INT-B1 the ONE deps pass (buildNewsEvidenceDeps — fetch, match, project; fail-closed)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const WIRE_ITEM = (over: Record<string, unknown> = {}) => ({
    id: "feed-1-0-1700000000000",
    headline: "RELIANCE Industries announces capex plan",
    summary: "Capex details inside.",
    source: "ET Corporate",
    category: "Corporate",
    subCategory: "Corporate",
    time: "10:00 IST",
    minutesAgo: 30,
    impact: "NEUTRAL",
    tags: ["RELIANCE"],
    isBreaking: false,
    isTrending: false,
    region: "INDIA",
    url: "https://example.com/reliance-1",
    pubDate: "2026-10-09T05:30:00.000Z",
    ...over,
  });

  const stubFetch = (body: string, status = 200) =>
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(body, { status })),
    );

  it("projects matched items into the deps shape with the STABLE id and the verbatim feed impact", async () => {
    stubFetch(JSON.stringify({ news: [WIRE_ITEM()] }));
    const deps = await buildNewsEvidenceDeps("RELIANCE", "https://app.test");
    expect(deps).toHaveLength(1);
    expect(deps[0]?.id).toBe(stableNewsIdOf(WIRE_ITEM() as never));
    expect(deps[0]?.headline).toContain("RELIANCE");
    expect(deps[0]?.source).toBe("ET Corporate");
    expect(deps[0]?.pubDate).toBe("2026-10-09T05:30:00.000Z");
    expect(deps[0]?.impact).toBe("NEUTRAL");
    // The ONE fetcher was called exactly once, at /api/news.
    const fetchMock = vi.mocked(fetch);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/api/news");
  });

  it("resolves the company name from the ONE registry (a name-only match still attributes)", async () => {
    stubFetch(
      JSON.stringify({
        news: [WIRE_ITEM({ headline: "Analysts weigh Reliance Industries capex outlook", tags: ["markets"] })],
      }),
    );
    const deps = await buildNewsEvidenceDeps("RELIANCE", "https://app.test");
    expect(deps).toHaveLength(1);
  });

  it("a fetch failure is an EMPTY deps array (the honest unavailable note — never a fabricated item)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new Error("network down");
    }));
    expect(await buildNewsEvidenceDeps("RELIANCE", "https://app.test")).toEqual([]);
  });

  it("a non-OK response is an EMPTY deps array", async () => {
    stubFetch("nope", 500);
    expect(await buildNewsEvidenceDeps("RELIANCE", "https://app.test")).toEqual([]);
  });

  it("non-JSON is an EMPTY deps array (the pre-registration fail-closed table)", async () => {
    stubFetch("<html>not json</html>");
    expect(await buildNewsEvidenceDeps("RELIANCE", "https://app.test")).toEqual([]);
  });

  it("a malformed item is refused individually; the well-formed rest still match (never a half-attributed citation)", async () => {
    stubFetch(
      JSON.stringify({
        news: [
          WIRE_ITEM({ url: 42 }), // wrong shape — dropped at the boundary
          WIRE_ITEM({ headline: "TCS wins a large deal", url: "https://example.com/tcs-1", tags: [] }),
        ],
      }),
    );
    const deps = await buildNewsEvidenceDeps("RELIANCE", "https://app.test");
    expect(deps).toHaveLength(0);
    const tcsDeps = await buildNewsEvidenceDeps("TCS", "https://app.test");
    expect(tcsDeps).toHaveLength(1);
    expect(tcsDeps[0]?.headline).toContain("TCS");
  });
});
