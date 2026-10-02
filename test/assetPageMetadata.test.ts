/**
 * Commit O / U5 (founder round 6): per-asset canonical + Open Graph metadata
 * on crypto, commodity and forex detail pages (bonds already had it), and
 * honest 24h-change semantics on the crypto detail surface.
 *
 * Founder evidence (2026-10-02): /crypto/BTC canonical was "/crypto", og:url
 * was the site root, prices showed no "$", and a "+2.45% (24h)" figure was
 * attached to a static reference value.
 *
 * Rule 21: the metadata rows FAIL on the pre-fix tree (no generateMetadata
 * existed on those pages).
 */
import { describe, expect, it } from "vitest";
import { generateMetadata as cryptoMeta } from "@/app/crypto/[symbol]/page";
import { generateMetadata as commodityMeta } from "@/app/commodities/[symbol]/page";
import { generateMetadata as forexMeta } from "@/app/forex/[pair]/page";

const SITE = "https://rishi-terminal.vercel.app";

describe("MUST FAIL PRE-U5: per-asset canonical and OG metadata", () => {
  it("crypto/BTC names the asset and carries its own canonical + og:url", async () => {
    const m = await cryptoMeta({ params: Promise.resolve({ symbol: "BTC" }) } as never);
    expect(m.title).toContain("BTC");
    expect(m.alternates?.canonical).toBe(`${SITE}/crypto/BTC`);
    expect((m.openGraph?.url as string) ?? "").toBe(`${SITE}/crypto/BTC`);
  });

  it("crypto metadata for an unknown symbol does not promise a page", async () => {
    const m = await cryptoMeta({ params: Promise.resolve({ symbol: "NOSUCHCOIN" }) } as never);
    expect(String(m.title)).toMatch(/not found/i);
  });

  it("commodity/GOLD carries its own canonical + og:url", async () => {
    const m = await commodityMeta({ params: Promise.resolve({ symbol: "GOLD" }) } as never);
    expect(m.title).toContain("GOLD");
    expect(m.alternates?.canonical).toBe(`${SITE}/commodities/GOLD`);
    expect((m.openGraph?.url as string) ?? "").toBe(`${SITE}/commodities/GOLD`);
  });

  it("forex pair USDINR carries its own canonical + og:url", async () => {
    const m = await forexMeta({ params: Promise.resolve({ pair: "USDINR" }) } as never);
    expect(m.title).toContain("USDINR");
    expect(m.alternates?.canonical).toBe(`${SITE}/forex/USDINR`);
    expect((m.openGraph?.url as string) ?? "").toBe(`${SITE}/forex/USDINR`);
  });
});
