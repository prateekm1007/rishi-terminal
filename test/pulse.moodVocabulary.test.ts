/**
 * PULSE-MOOD (founder direction 4, 2026-10-10 — the #314 partial-fix
 * catch): "MARKET MOOD … Use selective positioning" still prescribes
 * positioning on the same page the #314 fix cleaned. The pinned
 * vocabulary ban is WIDENED from the council line to the whole /pulse
 * page surface: every page-own readout is descriptive, and no
 * positioning verb appears anywhere in app/pulse/page.tsx or in any
 * locale's pulse subtree (English scripts scanned phrase-wise; Indic
 * scripts keep the per-locale recommendation-word scan on the council
 * label — see PULSE-ADVICE in this directory).
 *
 * Scope boundary (recorded, not silent — direction 8): the persona-
 * attributed commentary surfaces that /pulse renders (PHILOSOPHER_STANCES
 * sector implications, WorldMarketsGrid lens "actionable" arrays) are
 * seed-methodology attribution in the sanctioned guru/council/commentary
 * class and are NOT rewritten or scanned by this pin; converting them to
 * descriptive attribution is a seed-methodology content decision flagged
 * to the founder, not a drive-by.
 *
 * What this pin enforces on top of PULSE-ADVICE:
 *   1. The four positioning fragments of the pre-fix MARKET MOOD block
 *      are absent from the page source: "Use selective positioning",
 *      "stay selective", "Reduce beta", "Prefer defensives".
 *   2. The four descriptive mood readouts are present verbatim.
 *   3. The widened phrase list scans the WHOLE page file and every
 *      locale's ENTIRE pulse subtree (en/pseudo — the English scripts),
 *      not just the council-line strings.
 *   4. The scan bites: every widened pattern is proven against the
 *      pre-fix mood strings embedded below (B-18/C5).
 *
 * Fail-first: run against the pre-fix tree — raw RED capture at
 * docs/evidence/round44/red-pulse-mood.txt.
 */
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";

const PULSE_PAGE = readFileSync("app/pulse/page.tsx", "utf8");

/** The positioning vocabulary that must never appear in a page-own
 *  readout on /pulse. Multi-word phrases — no false positives on
 *  unrelated page text. */
const POSITIONING_PHRASES: RegExp[] = [
  /what the council recommends/i,
  /stay barbell/i,
  /keep cash/i,
  /avoid leverage/i,
  /prioritize balance-sheet strength/i,
  /size positions conservatively/i,
  /prefer quality compounders/i,
  /consensus tilts constructive/i,
  /quality defensives \+ selective cyclicals/i,
  // PULSE-MOOD widening (direction 4): the MARKET MOOD fragments.
  /use selective positioning/i,
  /stay selective/i,
  /reduce beta/i,
  /prefer defensives/i,
];

/** The pre-fix council lines (PULSE-ADVICE), verbatim — embedded so the
 *  bite control below proves the council-era patterns still detect their
 *  vocabulary inside THIS pin's list too. */
const PRE_FIX_COUNCIL_CORPUS = [
  "What the Council Recommends: Mixed regime. Stay barbell: quality defensives + selective cyclicals. Keep cash for volatility.",
  "High uncertainty. Avoid leverage, prioritize balance-sheet strength, and size positions conservatively.",
  "Consensus tilts constructive. Prefer quality compounders + domestic cyclicals with strong cashflows.",
].join(" ");

/** The pre-fix MARKET MOOD block, verbatim — the positive control
 *  proving every widened pattern detects real positioning vocabulary
 *  (embedded, never imported from the live tree). */
const PRE_FIX_MOOD_NEUTRAL = "Mixed signals. Use selective positioning.";
const PRE_FIX_MOOD_CAUT_BULL = "Positive bias, but stay selective.";
const PRE_FIX_MOOD_BEAR = "Risk-off conditions. Reduce beta.";
const PRE_FIX_MOOD_CAUT_BEAR = "Weak undertone. Prefer defensives.";
const PRE_FIX_MOOD_CORPUS = [
  PRE_FIX_MOOD_NEUTRAL,
  PRE_FIX_MOOD_CAUT_BULL,
  PRE_FIX_MOOD_BEAR,
  PRE_FIX_MOOD_CAUT_BEAR,
].join(" ");

/** The descriptive mood readouts the fix ships (must be present
 *  verbatim — a descriptive observation, never an instruction). */
const DESCRIPTIVE_MOOD_READOUTS = [
  "Mixed signals across breadth and momentum readings.",
  "Positive bias with uneven individual readings.",
  "Risk-off conditions across risk assets.",
  "Weak undertone with defensive sectors holding better.",
];

/** Locales whose pulse subtree is scanned phrase-wise: the English
 *  scripts (the regexes are English; claiming detection in scripts the
 *  patterns cannot read would be unverifiable — C1). Indic locales keep
 *  the per-locale recommendation-word label scan in PULSE-ADVICE. */
const PHRASE_SCANNED_LOCALES = ["en", "pseudo"];

function loadLocale(name: string): Record<string, unknown> | null {
  const path = `messages/${name}.json`;
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
}

/** Flatten every string value in a locale's pulse subtree. */
function pulseStrings(locale: string): string[] {
  const catalog = loadLocale(locale) as { pulse?: unknown } | null;
  const out: string[] = [];
  const walk = (node: unknown) => {
    if (typeof node === "string") out.push(node);
    else if (node && typeof node === "object") Object.values(node).forEach(walk);
  };
  if (catalog?.pulse) walk(catalog.pulse);
  return out;
}

function localeFiles(): string[] {
  return readdirSync("messages")
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(/\.json$/, ""));
}

describe("PULSE-MOOD — every page-own /pulse readout is descriptive, never positioning advice", () => {
  it("the widened scan bites: every positioning pattern detects its pre-fix vocabulary (positive control, B-18/C5)", () => {
    const corpus = `${PRE_FIX_MOOD_CORPUS} ${PRE_FIX_COUNCIL_CORPUS}`;
    for (const pattern of POSITIONING_PHRASES) {
      expect(
        pattern.test(corpus),
        `pattern ${pattern} must detect pre-fix positioning vocabulary`,
      ).toBe(true);
    }
    // Each pre-fix mood line is caught by at least one widened pattern.
    for (const line of [
      PRE_FIX_MOOD_NEUTRAL,
      PRE_FIX_MOOD_CAUT_BULL,
      PRE_FIX_MOOD_BEAR,
      PRE_FIX_MOOD_CAUT_BEAR,
    ]) {
      const hits = POSITIONING_PHRASES.filter((p) => p.test(line)).length;
      expect(hits, `pre-fix mood line must be caught: ${line}`).toBeGreaterThanOrEqual(1);
    }
  });

  it("the locale subtree scanner bites: advice vocabulary in a pulse locale value is detected (positive control)", () => {
    // A fixture locale pulse subtree carrying the pre-fix vocabulary must
    // be caught by the same scanner the live locales go through.
    const fixtureValues = [
      "Market mood: mixed signals. Use selective positioning.",
      "Weak undertone. Prefer defensives.",
    ];
    for (const value of fixtureValues) {
      const hits = POSITIONING_PHRASES.filter((p) => p.test(value)).length;
      expect(hits, `scanner must catch fixture locale value: ${value}`).toBeGreaterThanOrEqual(1);
    }
  });

  it("the positioning vocabulary is absent from the WHOLE pulse page source (widened, direction 4)", () => {
    for (const pattern of POSITIONING_PHRASES) {
      expect(
        pattern.test(PULSE_PAGE),
        `positioning vocabulary present in app/pulse/page.tsx: ${pattern}`,
      ).toBe(false);
    }
  });

  it("the four descriptive mood readouts are present verbatim in the pulse page", () => {
    for (const readout of DESCRIPTIVE_MOOD_READOUTS) {
      expect(PULSE_PAGE.includes(readout), `missing descriptive mood readout: ${readout}`).toBe(true);
    }
  });

  it("the widened phrase scan covers every string in the English-script locale pulse subtrees", () => {
    // Positive control first (B-18): the scanned locales DO carry a pulse
    // subtree with content — a scan over nothing proves nothing.
    for (const locale of PHRASE_SCANNED_LOCALES) {
      const values = pulseStrings(locale);
      expect(
        values.length,
        `${locale} must carry a pulse subtree with values to scan`,
      ).toBeGreaterThan(10);
      for (const value of values) {
        for (const pattern of POSITIONING_PHRASES) {
          expect(
            pattern.test(value),
            `${locale} pulse subtree carries positioning vocabulary (${pattern}): ${value}`,
          ).toBe(false);
        }
      }
    }
  });

  it("every locale that carries a pulse section keeps it free of the old council-line key (PULSE-ADVICE regression hold)", () => {
    for (const locale of localeFiles()) {
      const catalog = loadLocale(locale) as { pulse?: Record<string, string> } | null;
      if (!catalog?.pulse) continue;
      expect(
        catalog.pulse["councilRecommends"],
        `${locale} still carries the old councilRecommends key`,
      ).toBeUndefined();
    }
  });
});
