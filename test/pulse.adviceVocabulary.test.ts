/**
 * PULSE-ADVICE (founder direction, 2026-10-10): the /pulse council line
 * is an investigation readout, not advice. The pre-fix line rendered
 * "What the Council Recommends: Mixed regime. Stay barbell: quality
 * defensives + selective cyclicals. Keep cash for volatility." —
 * prescriptive positioning language that contradicts the
 * investigation-not-advice contract (the same class in all three
 * branches: "Avoid leverage… size positions conservatively", "Prefer
 * quality compounders…").
 *
 * What this pin enforces:
 *   1. The advice vocabulary is ABSENT from the pulse page's readout
 *      strings AND from every locale's council-line label (the
 *      recommendation word in each locale's script is scanned —
 *      सिफारिश / সুপারিশ / शिफारस / பரிந்துரை / సిఫార్సు).
 *   2. The descriptive replacement is PRESENT: the three regime
 *      readouts in the page source and the descriptive label through
 *      the locale key.
 *   3. The scan itself BITES: every vocabulary pattern is proven
 *      against the pre-fix strings embedded below (B-18: a zero-count
 *      without a positive control proves nothing; C5: a gate that
 *      cannot fail is theater).
 *
 * Fail-first: run against the pre-fix tree — raw RED capture at
 * docs/evidence/round43/red-pulse-advice.txt.
 */
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";

const PULSE_PAGE = readFileSync("app/pulse/page.tsx", "utf8");

/** The advice vocabulary that must never appear in the council line.
 *  Multi-word phrases (no false positives on unrelated page text). */
const ADVICE_PHRASES: RegExp[] = [
  /what the council recommends/i,
  /stay barbell/i,
  /keep cash/i,
  /avoid leverage/i,
  /prioritize balance-sheet strength/i,
  /size positions conservatively/i,
  /prefer quality compounders/i,
  /consensus tilts constructive/i,
  /quality defensives \+ selective cyclicals/i,
];

/** The pre-fix rendered line and the pre-fix label, verbatim — the
 *  positive control proving every pattern above detects real advice
 *  vocabulary (embedded, never imported from the live tree). */
const PRE_FIX_LINE =
  "What the Council Recommends: Mixed regime. Stay barbell: quality defensives + selective cyclicals. Keep cash for volatility.";
const PRE_FIX_LINE_HIGH_DISAGREEMENT =
  "High uncertainty. Avoid leverage, prioritize balance-sheet strength, and size positions conservatively.";
const PRE_FIX_LINE_CONVERGENT =
  "Consensus tilts constructive. Prefer quality compounders + domestic cyclicals with strong cashflows.";
const PRE_FIX_LABELS: Record<string, string> = {
  en: "What the Council Recommends:",
  hi: "परिषद की सिफारिश:",
  bn: "পরিষদ কী সুপারিশ করে:",
  mr: "परिषद काय शिफारस करते:",
  ta: "கவுன்சில் பரிந்துரைப்பது:",
  te: "మండలి సిఫార్సు చేసేది:",
};

/** The recommendation word per locale script (must be absent from the
 *  council-line label of that locale). */
const RECOMMENDATION_WORD_BY_LOCALE: Record<string, RegExp> = {
  en: /recommend/i,
  pseudo: /recommend/i,
  hi: /सिफारिश/,
  bn: /সুপারিশ/,
  mr: /शिफारस/,
  ta: /பரிந்துரை/,
  te: /సిఫార్సు/,
};

const NEW_LABEL_KEY = "councilRegimeRead";
const OLD_LABEL_KEY = "councilRecommends";

/** The descriptive readouts the fix ships (must be present verbatim). */
const DESCRIPTIVE_READOUTS = [
  "High disagreement: the lenses read the current regime very differently across indicators.",
  "The readings converge on a constructive view of the current regime.",
  "A mixed read: the lenses diverge across the current regime's indicators.",
];

function loadLocale(name: string): Record<string, unknown> | null {
  const path = `messages/${name}.json`;
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
}

function localeFiles(): string[] {
  return readdirSync("messages")
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(/\.json$/, ""));
}

describe("PULSE-ADVICE — the council line is an investigation readout, not advice", () => {
  it("the scan bites: every advice pattern detects the pre-fix strings (positive control, B-18/C5)", () => {
    // Each phrase pattern must match at least one pre-fix string, and the
    // three pre-fix lines must each be caught by at least two patterns.
    for (const pattern of ADVICE_PHRASES) {
      const preFixCorpus = [
        PRE_FIX_LINE,
        PRE_FIX_LINE_HIGH_DISAGREEMENT,
        PRE_FIX_LINE_CONVERGENT,
      ].join(" ");
      expect(
        pattern.test(preFixCorpus),
        `pattern ${pattern} must detect the pre-fix vocabulary`,
      ).toBe(true);
    }
    for (const line of [
      PRE_FIX_LINE,
      PRE_FIX_LINE_HIGH_DISAGREEMENT,
      PRE_FIX_LINE_CONVERGENT,
    ]) {
      const hits = ADVICE_PHRASES.filter((p) => p.test(line)).length;
      expect(hits, `pre-fix line must be caught: ${line.slice(0, 40)}…`).toBeGreaterThanOrEqual(2);
    }
    // The per-locale recommendation-word scans detect the pre-fix labels.
    for (const [locale, word] of Object.entries(RECOMMENDATION_WORD_BY_LOCALE)) {
      const label = PRE_FIX_LABELS[locale] ?? PRE_FIX_LABELS.en;
      expect(word.test(label), `${locale} word must detect its pre-fix label`).toBe(true);
    }
  });

  it("the advice vocabulary is absent from the pulse page source", () => {
    for (const pattern of ADVICE_PHRASES) {
      expect(
        pattern.test(PULSE_PAGE),
        `advice vocabulary present in app/pulse/page.tsx: ${pattern}`,
      ).toBe(false);
    }
  });

  it("the descriptive regime readouts are present verbatim in the pulse page", () => {
    for (const readout of DESCRIPTIVE_READOUTS) {
      expect(PULSE_PAGE.includes(readout), `missing descriptive readout: ${readout}`).toBe(true);
    }
  });

  it("the label is the descriptive regime read through the new key (old key gone)", () => {
    expect(PULSE_PAGE.includes(`t('pulse.${NEW_LABEL_KEY}')`)).toBe(true);
    expect(PULSE_PAGE.includes(`pulse.${OLD_LABEL_KEY}`)).toBe(false);
    const en = loadLocale("en") as { pulse: Record<string, string> };
    expect(en.pulse[NEW_LABEL_KEY]).toBe("Council regime read:");
    expect(en.pulse[OLD_LABEL_KEY]).toBeUndefined();
  });

  it("every locale that carries a pulse section carries the descriptive label, advice-free", () => {
    for (const locale of localeFiles()) {
      const catalog = loadLocale(locale) as { pulse?: Record<string, string> } | null;
      if (!catalog?.pulse) continue; // locales without a pulse section are out of scope here
      const label = catalog.pulse[NEW_LABEL_KEY];
      expect(
        typeof label === "string" && label.length > 0,
        `${locale} must carry pulse.${NEW_LABEL_KEY}`,
      ).toBe(true);
      expect(
        catalog.pulse[OLD_LABEL_KEY],
        `${locale} still carries the old ${OLD_LABEL_KEY} key`,
      ).toBeUndefined();
      const word = RECOMMENDATION_WORD_BY_LOCALE[locale] ?? /recommend/i;
      expect(
        word.test(label as string),
        `${locale} label still contains the recommendation word: ${label}`,
      ).toBe(false);
    }
  });
});
