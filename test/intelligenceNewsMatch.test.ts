/**
 * INT-B1 — per-symbol news evidence (roadmap item B1): the deterministic
 * symbol-match, the content-derived stable evidence id, and the caps.
 *
 * Pre-registration: docs/intelligence/newsEvidence.md (committed BEFORE
 * any evaluation). Rule 21 fail-first: on the pre-module tree this file
 * fails at import (modules missing) — the A3..A10 precedent.
 */
import { describe, expect, it } from "vitest";

import { matchNewsForSymbol, stableNewsIdOf } from "@/lib/intelligence/newsMatch";

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
});
