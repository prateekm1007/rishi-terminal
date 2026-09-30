import { describe, expect, it } from "vitest";
import {
  PROVIDER_REGISTRY,
  PROVIDER_IDS,
  getProviderDefinition,
  isProviderApproved,
  approvedProviders,
} from "@/lib/registry/providerRegistry";

// T43: the registry is the single source of truth. Everything observed at
// runtime must be registered; only APPROVED providers may serve production.
describe("providerRegistry", () => {
  it("has unique ids with required terms/docs URLs", () => {
    const entries = Object.values(PROVIDER_REGISTRY);
    const ids = entries.map(p => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const p of entries) {
      expect(p.termsUrl).toMatch(/^https:\/\//);
      expect(p.docsUrl).toMatch(/^https:\/\//);
      expect(["none", "api-key", "oauth"]).toContain(p.auth);
    }
  });

  it("marks the production keyless stack APPROVED", () => {
    for (const id of [
      PROVIDER_IDS.NSE,
      PROVIDER_IDS.BSE,
      PROVIDER_IDS.YAHOO,
      PROVIDER_IDS.COINGECKO,
      PROVIDER_IDS.EXCHANGERATE_API,
      PROVIDER_IDS.FRED_CSV,
      PROVIDER_IDS.ECB_FX,
      PROVIDER_IDS.RSS_NEWS,
      PROVIDER_IDS.CHAT_API,
      PROVIDER_IDS.GEMINI,
    ]) {
      expect(isProviderApproved(id), id).toBe(true);
    }
  });

  it("keeps T36-gated sources out of production routing", () => {
    // Screener scrape + FMP: free access ≠ display rights (T36).
    expect(isProviderApproved(PROVIDER_IDS.SCREENER)).toBe(false);
    expect(isProviderApproved(PROVIDER_IDS.FMP)).toBe(false);
    expect(getProviderDefinition(PROVIDER_IDS.SCREENER)?.status).toBe("RESEARCH_ONLY");
    // Finnhub: removed with its dead client.
    expect(getProviderDefinition(PROVIDER_IDS.FINNHUB)?.status).toBe("REJECTED");
    // Keyed candidates stay research-only until founder verifies terms.
    expect(isProviderApproved(PROVIDER_IDS.ALPHAVANTAGE)).toBe(false);
    expect(isProviderApproved(PROVIDER_IDS.TWELVEDATA)).toBe(false);
    expect(isProviderApproved(PROVIDER_IDS.FRED_API)).toBe(false);
    expect(isProviderApproved(PROVIDER_IDS.HUGGINGFACE)).toBe(false);
  });

  it("approvedProviders returns only APPROVED entries", () => {
    expect(approvedProviders().every(p => p.status === "APPROVED")).toBe(true);
    expect(approvedProviders().length).toBeGreaterThanOrEqual(10);
  });
});
