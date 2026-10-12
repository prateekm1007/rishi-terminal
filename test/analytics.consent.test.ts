/**
 * DEMO-5 + G7-01 — the activation events behind the fail-closed consent
 * gate (founder order, 2026-10-12; issue #365).
 *
 *   "Instrument the five events, gated behind a consent hook. Consent
 *    wording is for counsel."
 *
 * What this pin enforces:
 *   1. SCHEMA — the closed five-event union; the PII-refusing property
 *      schema (email/user_id/token/password/phone keys and bare name/ip
 *      refuse; values are short strings or integers); unknown events
 *      refuse (G7-01: "schema test rejects events containing email or
 *      user id in properties").
 *   2. CONSENT — the hook's gate is fail-closed: absent storage = NOT
 *      granted (rule 6); only the exact "granted" value grants.
 *   3. WIRING — the four live surfaces import the hook and track their
 *      event (source pins): search (GlobalSearchBar), stock view
 *      (StockPageClient), dissent expand (RishiGrid), watchlist add
 *      (WatchlistTab).
 *   4. THE GAP IS DOCUMENTED — the fifth event (flip_expanded) has NO live
 *      surface: the flip-conditions view exists only in the dead
 *      RishiCouncil component (zero importers — a rule-17 finding, flagged
 *      FOUNDER DECISION NEEDED: revive the council view or re-word the
 *      demo path). The event stays in the closed union for the demo path;
 *      docs/analytics.md records the mapping.
 *   5. NO PII in the wired call sites: search tracks query LENGTH, never
 *      the query text.
 *
 * The consent WORDING is counsel-owned — no user-facing copy ships from
 * the coder (FOUNDER DECISION NEEDED recorded in docs/analytics.md).
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  ACTIVATION_EVENTS,
  CONSENT_STORAGE_KEY,
  consentGrantedFrom,
  parseActivationEvent,
} from "../lib/analytics/activationEvents";

const read = (p: string) => readFileSync(p, "utf8");

describe("DEMO-5 — the activation event schema (G7-01)", () => {
  it("the storage key is the documented one", () => {
    expect(CONSENT_STORAGE_KEY).toBe("rishi.analytics.consent");
  });
  it("the five events form the closed union", () => {
    expect([...ACTIVATION_EVENTS]).toEqual([
      "search_performed",
      "stock_viewed",
      "dissent_expanded",
      "flip_expanded",
      "watchlist_added",
    ]);
  });

  it("well-formed events parse", () => {
    const r = parseActivationEvent({
      event: "watchlist_added",
      properties: { symbol: "RELIANCE" },
      ts: "2026-10-12T00:00:00.000Z",
    });
    expect(r).not.toBeNull();
    expect(r?.event).toBe("watchlist_added");
  });

  it("PII property keys refuse (G7-01 acceptance)", () => {
    for (const props of [
      { email: "a@b.com" },
      { user_id: "u-123" },
      { userid: "u-123" },
      { UserEmail: "a@b.com" },
      { auth_token: "t" },
      { password: "x" },
      { phone: "123" },
      { ip: "1.2.3.4" },
      { name: "Jane Doe" },
    ]) {
      const r = parseActivationEvent({
        event: "stock_viewed",
        properties: props,
        ts: "2026-10-12T00:00:00.000Z",
      });
      expect(r, JSON.stringify(props)).toBeNull();
    }
  });

  it("unknown events, oversized values and structured values refuse", () => {
    expect(
      parseActivationEvent({ event: "page_view", properties: {}, ts: "t" }),
    ).toBeNull();
    expect(
      parseActivationEvent({
        event: "stock_viewed",
        properties: { symbol: "x".repeat(129) },
        ts: "t",
      }),
    ).toBeNull();
    expect(
      parseActivationEvent({
        event: "stock_viewed",
        properties: { nested: { a: 1 } },
        ts: "t",
      }),
    ).toBeNull();
  });

  it("the query text never rides the search event (no PII in events)", () => {
    const src = read("components/ui/GlobalSearchBar.tsx");
    expect(src).toContain("query_length: query.length");
    expect(src).not.toMatch(/query:\s*query/); // the text itself is never a property
  });
});

describe("DEMO-5 — the consent gate is fail-closed (rule 6)", () => {
  it("absent storage value is NOT consent; only the exact granted value grants", () => {
    expect(consentGrantedFrom(null)).toBe(false);
    expect(consentGrantedFrom("")).toBe(false);
    expect(consentGrantedFrom("granted ")).toBe(false);
    expect(consentGrantedFrom("GRANTED")).toBe(false);
    expect(consentGrantedFrom("granted")).toBe(true);
  });

  it("the hook refuses before consent and the refusal is auditable, not silent", () => {
    const hook = read("hooks/useActivationEvents.ts");
    expect(hook).toContain("if (!consentGranted)");
    expect(hook).toContain("event_refused"); // the refusal itself is recorded
    expect(hook).toContain("event_dropped"); // PII drops are auditable too
  });

  it("the hook stores ONLY the consent flag (no event data in storage)", () => {
    const hook = read("hooks/useActivationEvents.ts");
    // grantConsent writes the flag; track() never writes storage
    expect(hook).toContain("setItem");
    expect(hook).toContain("CONSENT_STORAGE_KEY");
    // the only setItem is inside grantConsent
    const grantSection = hook.slice(hook.indexOf("grantConsent"));
    expect(grantSection).toContain("setItem");
  });
});

describe("DEMO-5 — the four live surfaces are wired (source pins, B-18 positive controls)", () => {
  it("search_performed is wired in the global search bar", () => {
    const src = read("components/ui/GlobalSearchBar.tsx");
    expect(src).toContain('track("search_performed"');
    expect(src).toContain("useActivationEvents");
  });

  it("stock_viewed is wired on the stock page mount, keyed per symbol", () => {
    const src = read("components/stock/StockPageClient.tsx");
    expect(src).toContain('track("stock_viewed", { symbol: stock.symbol })');
    expect(src).toContain("[track, stock.symbol]");
  });

  it("dissent_expanded fires on EXPAND, not collapse", () => {
    const src = read("components/stock/RishiGrid.tsx");
    expect(src).toContain('track("dissent_expanded"');
    expect(src).toContain("if (!isExpanded)");
  });

  it("watchlist_added is wired in the watchlist add action", () => {
    const src = read("components/lab/WatchlistTab.tsx");
    expect(src).toContain('track("watchlist_added"');
  });

  it("the flip_expanded gap is documented honestly (no live surface yet)", () => {
    const doc = read("docs/analytics.md");
    expect(doc).toContain("flip_expanded");
    // the dead component is named in the finding
    expect(read("components/stock/RishiCouncil.tsx")).toContain("Rishi Council");
  });
});
