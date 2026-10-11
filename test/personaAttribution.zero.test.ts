/**
 * Round-47 P0-7-PERSONA-ATTRIBUTION (founder order, 2026-10-11):
 *
 *   "Remove real-person quotes and attributions. Delete the
 *    Jhunjhunwala line, rewrite the Saylor, Rogers, Rule and Yergin
 *    subtitles, and correct the Graham attribution in RELIANCE's
 *    commentary."
 *
 * What this pin enforces:
 *   1. No attributed quotation of a real person renders anywhere: the
 *      persona quote FIELD is gone (registry + display mirror + the
 *      /rishis empty-state render), the crypto/commodity guru cards
 *      carry descriptive framework text (never quoted speech), and the
 *      bond/forex rishi shells lost their quote cards.
 *   2. The Jhunjhunwala commentary line is gone (no fabricated speech
 *      attributed to a real deceased person).
 *   3. The Graham attribution is CORRECT: the commentary invokes the
 *      margin of safety (Graham's documented central concept, The
 *      Intelligent Investor ch. 20) — never the "first rule: do not
 *      lose money" formulation, which is Buffett's.
 *   4. Positive controls (B-18): the descriptive replacements exist —
 *      the framework fields, the corrected Graham sentence.
 *   5. The scan bites (C5): patterns proven against embedded pre-fix
 *      strings.
 */
import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(p, "utf8");

function uiStringFiles(): string[] {
  const roots = ["app", "components", "lib", "data"];
  const out: string[] = [];
  for (const root of roots) {
    const walk = (dir: string) => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, e.name);
        if (e.isDirectory()) walk(p);
        else if (/\.(ts|tsx)$/.test(e.name) && !e.name.includes(".test.")) {
          out.push(p);
        }
      }
    };
    walk(root);
  }
  return out;
}

/** Attributed-quotation shapes. The "quote" WORD also names the price-quote
 *  domain (currency quote codes, cache keys, CSS classes) — the patterns
 *  below target quotation SPEECH specifically: a quoted-attribution
 *  render, a string field of speech-like length, or an "As <person>
 *  would say" commentary line. */
const QUOTED_RENDER = /&quot;\{[a-zA-Z.]+\.quote\}&quot;/;
const QUOTE_SPEECH_FIELD = /quote(\?)?:\s*(['"`])(?:[^'"`\n]{40,})\2/;
const AS_PERSON_WOULD_SAY = /As (Jhunjhunwala|Graham|Buffett|Munger|Damani|Lynch) would/;

describe("P0-7 — real-person quotes and attributions are gone", () => {
  it("no quote field or quoted-attribution render exists in the UI tree", () => {
    const files = uiStringFiles();
    expect(files.length).toBeGreaterThan(200);
    const hits: string[] = [];
    for (const f of files) {
      const src = read(f);
      for (const [i, raw] of src.split("\n").entries()) {
        if (raw.trim().startsWith("//") || raw.trim().startsWith("*")) continue;
        if (QUOTE_SPEECH_FIELD.test(raw) || QUOTED_RENDER.test(raw) || AS_PERSON_WOULD_SAY.test(raw)) {
          hits.push(`${f}:${i + 1}: ${raw.trim().slice(0, 100)}`);
        }
      }
    }
    expect(hits).toEqual([]);
  });

  it("the Jhunjhunwala commentary line is deleted", () => {
    const commentary = read("lib/scorers/commentary.ts");
    expect(commentary).not.toContain("As Jhunjhunwala would say");
    expect(commentary).not.toMatch(/Jhunjhunwala/);
  });

  it("the Graham attribution is corrected — margin of safety, not the Buffett 'first rule'", () => {
    const commentary = read("lib/scorers/commentary.ts");
    // The misattributed formulation is gone...
    expect(commentary).not.toContain("the first rule of investing is: do not lose money");
    // ...and Graham is correctly credited with HIS documented concept.
    expect(commentary).toContain("As Graham taught, the margin of safety is the central concept of investment");
  });

  it("the Saylor, Rogers, Rule and Yergin subtitles are descriptive (positive control, B-18)", () => {
    const cryptoGurus = read("lib/gurus/crypto.ts");
    const commodityGurus = read("lib/gurus/commodity.ts");
    // Saylor: corporate-treasury framework, no quoted speech
    expect(cryptoGurus).toContain("Corporate-treasury framework");
    expect(cryptoGurus).not.toContain("bank in cyberspace");
    // Rogers: contrarian cycle timing, no quoted speech
    expect(commodityGurus).toContain("Contrarian cycle timing");
    expect(commodityGurus).not.toContain("nobody wants them");
    // Rule: monetary-hardness lens, no quoted speech
    expect(commodityGurus).toContain("monetary-hardness lens");
    expect(commodityGurus).not.toContain("Gold is money");
    // Yergin: energy-history lens, no quoted speech
    expect(commodityGurus).toContain("Energy history as the base layer of geopolitics");
    expect(commodityGurus).not.toContain("lifeblood");
  });

  it("the guru card renders carry framework text, never quoted speech", () => {
    const crypto = read("components/crypto/CryptoDetailClient.tsx");
    const commodity = read("components/commodities/CommodityDetailClient.tsx");
    expect(crypto).toContain("r.framework");
    expect(crypto).not.toContain("r.philosophy");
    expect(commodity).not.toMatch(/&quot;\{r\./);
    // The /rishis empty state renders bio + formula, never a quotation
    const rishis = read("app/rishis/page.tsx");
    expect(rishis).not.toContain("selectedRishi.quote");
  });

  it("the patterns bite (embedded pre-fix strings must match — C5)", () => {
    expect("quote: 'I am a firm believer in the India story and its decades of compounding ahead.',".match(QUOTE_SPEECH_FIELD)).not.toBeNull();
    expect('&quot;{selectedRishi.quote}&quot;'.match(QUOTED_RENDER)).not.toBeNull();
    expect("As Jhunjhunwala would say – this is a business".match(AS_PERSON_WOULD_SAY)).not.toBeNull();
    // the price-quote domain and short codes stay legal
    expect("quote: 'INR',".match(QUOTE_SPEECH_FIELD)).toBeNull();
    expect("philosophy: 'Buy commodities when nobody wants them.'".match(AS_PERSON_WOULD_SAY)).toBeNull();
  });

  it("the dead quote-bearing modules are gone (rule 17)", () => {
    // data/marketPulse (fabricated movers), rishiQuotes + assetDetail i18n
    // blocks, the dead gamification widget and wisdom-of-day quote
    // database — all deleted with their consumers verified absent.
    const en = read("messages/en.json");
    expect(en).not.toContain("rishiQuotes");
    expect(en).not.toContain("assetDetail");
    const fileGone = (p: string) => {
      try { read(p); return false; } catch { return true; }
    };
    expect(fileGone("lib/wisdom/wisdom-of-day.ts")).toBe(true);
    expect(fileGone("lib/gamification/index.ts")).toBe(true);
    expect(fileGone("data/marketPulse/index.ts")).toBe(true);
  });
});
