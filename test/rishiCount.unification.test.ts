/**
 * RISHI-COUNT (founder direction 5, 2026-10-10 — the 19/20/21 split).
 *
 * The same concept ("how many Rishis does this product have?") answered
 * differently on four surfaces, verified live in the round-43/44 survey:
 *   - the registry / /api/chat/personas / /pricing copy say 21,
 *   - the /rishis roster rendered 19 (MARKETING_PERSONAS filtered the
 *     rank-less chanos/soros entries out of the marketing card set),
 *   - the hero + wisdom-banner + og/manifest metadata said 20,
 *   - the scoring council (RISHI_WEIGHT_CONFIG) IS 20 (soros in, chanos
 *     out — a documented methodology membership, not a display bug).
 *
 * Sanctioned unification (worklog spec, founder-approved): the registry's
 * 21 is the roster — chanos and soros get display ranks and marketing
 * cards; every roster-facing count surface says 21; the council stays 20
 * with the chanos exclusion DOCUMENTED here and in lib/gurus/weights.ts.
 * Council membership changes (adding chanos as a scorer) are a
 * methodology decision that rides separately — this pin must not be
 * "fixed" by editing the council.
 *
 * What this pin enforces (the 8 tests; pre-fix RED 6F/2P, raw capture at
 * docs/evidence/round44/red-rishi-count.txt):
 *   1. The /rishis roster is 21 — ALL_RISHIS == MARKETING_PERSONAS.
 *   2. chanos and soros carry render-complete marketing cards (every
 *      field app/rishis/page.tsx renders: rank, label, bio, formula,
 *      bestFor, quote, origin, category).
 *   3. Every locale's roster-facing count copy says 21 (hero highlight +
 *      wisdom-banner title; gu falls back to en at runtime — the en
 *      string is the rendered truth for gu, tested as the fallback).
 *   4. The hardcoded metadata (app/layout.tsx, app/manifest.tsx) says
 *      21 legendary investors; zero "20 legendary" remains.
 *   5. The count-bearing DEAD locale keys are deleted from every locale
 *      (common.exploreAllRishis, stock.allRishiScores, screener.subtitle,
 *      dashboard.rishiConsensus, header.subtitle, asset.wisdomDesc — all
 *      carried the stale 20 and none is referenced by any component),
 *      with live-key positive controls proving the deletion is surgical.
 *   6. The /pricing "All 21 Rishis" copy equals the ACTUAL roster length
 *      (copy-vs-data drift gate: the number in the string must match
 *      ALL_RISHIS.length, so a future roster change forces the copy).
 *   7. The documented council exclusion holds: RISHI_WEIGHT_CONFIG is 20,
 *      every council name resolves to a registry persona, and the
 *      registry-minus-council set is EXACTLY {chanos} (soros in).
 *   8. The client projection mirror stays field-exact for all 21 (the
 *      G10 split-script invariant, now covering the two new cards).
 *
 * Council-count surfaces are deliberately NOT forced to 21 here:
 * stock.wisdomDesc ("All 20 Philosopher Scores") labels the wisdom-tab
 * verdict set, which the scoring council (20) produces — that 20 is the
 * honest number for THAT surface and is pinned by tests 7/8 boundaries.
 */
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import {
  CANONICAL_PERSONAS,
  MARKETING_PERSONAS,
  resolveCanonicalPersona,
} from "@/lib/chat/registry";
import { ALL_RISHIS } from "@/lib/chat/personas";
import { PERSONA_DISPLAY } from "@/lib/chat/registryDisplay";
import { RISHI_WEIGHT_CONFIG } from "@/lib/gurus/weights";

/** Locales that ship a message catalog (en + 7 translations + pseudo). */
function localeFiles(): string[] {
  return readdirSync("messages")
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(/\.json$/, ""));
}

function loadLocale(name: string): Record<string, unknown> {
  const path = `messages/${name}.json`;
  if (!existsSync(path)) throw new Error(`missing locale file: ${path}`);
  return JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
}

function localeString(locale: string, dottedKey: string): string | undefined {
  let node: unknown = loadLocale(locale);
  for (const part of dottedKey.split(".")) {
    if (!node || typeof node !== "object" || !(part in (node as Record<string, unknown>))) {
      return undefined;
    }
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === "string" ? node : undefined;
}

/** The count-bearing locale keys the round-43/44 survey found dead:
 * zero component references (grep-proven in the PR), all carrying the
 * stale 20. Deleted, never re-translated. */
const DEAD_COUNT_KEYS = [
  "common.exploreAllRishis",
  "stock.allRishiScores",
  "screener.subtitle",
  "dashboard.rishiConsensus",
  "header.subtitle",
  "asset.wisdomDesc",
];

/** Live keys adjacent to each deletion — the positive controls proving
 * the deletion is surgical, not a ripped-out namespace (B-18). */
const LIVE_CONTROL_KEYS = [
  "screener.title",
  "stock.wisdomDesc",
  "pricing.free.allRishis",
  "header.title",
];

describe("RISHI-COUNT — one concept, one number: the roster is 21 everywhere it is claimed", () => {
  it("the /rishis roster is 21 personas — ALL_RISHIS equals MARKETING_PERSONAS (the 19-split is closed)", () => {
    expect(MARKETING_PERSONAS.length).toBe(21);
    expect(ALL_RISHIS.length).toBe(21);
    expect(new Set(ALL_RISHIS.map(r => r.id))).toEqual(
      new Set(MARKETING_PERSONAS.map(p => p.id)),
    );
    // The two historically missing ids are present on the rendered roster.
    const rosterIds = new Set(ALL_RISHIS.map(r => r.id));
    expect(rosterIds.has("chanos")).toBe(true);
    expect(rosterIds.has("soros")).toBe(true);
  });

  it("chanos and soros carry render-complete marketing cards (every field /rishis renders)", () => {
    for (const id of ["chanos", "soros"]) {
      const p = CANONICAL_PERSONAS.find(x => x.id === id);
      expect(p, `registry persona ${id}`).toBeDefined();
      // app/rishis/page.tsx renders: rank badge, label, origin, bestFor,
      // quote, bio, formula (+ emoji/name carried by the identity fields).
      expect(p!.rank, `${id}.rank`).toMatch(/^(Legend|Master)$/);
      expect(p!.label, `${id}.label non-empty`).toBeTruthy();
      expect(p!.bio, `${id}.bio non-empty`).toBeTruthy();
      expect(p!.formula, `${id}.formula non-empty`).toBeTruthy();
      expect(Array.isArray(p!.bestFor), `${id}.bestFor array`).toBe(true);
      expect(p!.bestFor!.length, `${id}.bestFor non-empty`).toBeGreaterThan(0);
      expect(p!.quote, `${id}.quote non-empty`).toBeTruthy();
      expect(p!.origin, `${id}.origin non-empty`).toBeTruthy();
      expect(p!.category, `${id}.category non-empty`).toBeTruthy();
    }
  });

  it("every locale's roster-facing count copy says 21 (hero highlight + wisdom banner; en is gu's runtime fallback)", () => {
    const ROSTER_COUNT_STRINGS: Array<[string, RegExp]> = [
      ["dashboard.heroWisdomHighlight", /21|২১|२१|౨౧|௨௧/],
      ["dashboard2.wisdom.title", /21|২১|२१|౨౧|௨௧/],
    ];
    for (const locale of localeFiles()) {
      for (const [key, countPattern] of ROSTER_COUNT_STRINGS) {
        const value = localeString(locale, key);
        if (value === undefined) {
          // gu omits these keys and renders the EN fallback at runtime
          // (lib/language.tsx fallback chain) — the en assertion below is
          // the rendered truth for gu. Any OTHER locale omitting the key
          // would silently keep a stale count: fail it.
          expect(locale, `locale ${locale} must not omit ${key} (only gu may fall back to en)`).toBe("gu");
          continue;
        }
        expect(
          countPattern.test(value),
          `${locale}.${key} must carry the 21 count, got: ${value}`,
        ).toBe(true);
      }
    }
    // The fallback itself must say 21 (what gu users actually see).
    expect(localeString("en", "dashboard.heroWisdomHighlight")).toMatch(/21 legendary investors/);
    expect(localeString("en", "dashboard2.wisdom.title")).toMatch(/21 Legendary Investors/);
  });

  it("the hardcoded metadata says 21 legendary investors — layout (title/og/twitter) and manifest, zero '20 legendary' left", () => {
    for (const file of ["app/layout.tsx", "app/manifest.ts"]) {
      const src = readFileSync(file, "utf8");
      expect(
        src.includes("21 legendary investors") || src.includes("21 Legendary"),
        `${file} must describe 21 legendary investors`,
      ).toBe(true);
      expect(
        /20 legendary/i.test(src),
        `${file} still claims 20 legendary investors`,
      ).toBe(false);
    }
  });

  it("the count-bearing dead locale keys are deleted from EVERY locale (live neighbours stay)", () => {
    for (const locale of localeFiles()) {
      for (const key of DEAD_COUNT_KEYS) {
        expect(
          localeString(locale, key),
          `${locale} still carries the dead count key ${key} (unreferenced since the survey; delete, never re-translate)`,
        ).toBeUndefined();
      }
    }
    // Positive controls (B-18): the namespaces around the deletions are
    // still alive — the deletion is surgical, not a ripped-out subtree.
    for (const locale of localeFiles()) {
      for (const key of LIVE_CONTROL_KEYS) {
        expect(
          localeString(locale, key),
          `${locale} lost LIVE key ${key} — the deletion was not surgical`,
        ).toBeTruthy();
      }
    }
  });

  it("the /pricing roster copy equals the ACTUAL roster length (copy-vs-data drift gate)", () => {
    const copy = localeString("en", "pricing.free.allRishis");
    expect(copy, "en pricing.free.allRishis exists").toBeTruthy();
    const claimed = copy!.match(/All (\d+) Rishis/);
    expect(claimed, "copy carries the 'All N Rishis' form").toBeTruthy();
    expect(Number(claimed![1])).toBe(ALL_RISHIS.length);
    // The same claim is shipped in every locale (pseudo decorates with its
    // bracket/padding convention — compare the COUNT, not the bytes).
    for (const locale of localeFiles()) {
      const localized = localeString(locale, "pricing.free.allRishis");
      expect(localized, `${locale} pricing.free.allRishis exists`).toBeTruthy();
      const localizedCount = localized!.match(/All (\d+) Rishis/);
      expect(
        localizedCount,
        `${locale} copy carries the 'All N Rishis' form`,
      ).toBeTruthy();
      expect(
        Number(localizedCount![1]),
        `${locale} pricing count must equal the roster`,
      ).toBe(ALL_RISHIS.length);
    }
  });

  it("the documented council exclusion holds: 20 scorers, every name canonical, registry-minus-council is EXACTLY {chanos}", () => {
    expect(RISHI_WEIGHT_CONFIG).toHaveLength(20);
    const councilIds = new Set<string>();
    for (const member of RISHI_WEIGHT_CONFIG) {
      const persona = resolveCanonicalPersona(member.name);
      expect(
        persona,
        `council member "${member.name}" must resolve to a registry persona`,
      ).not.toBeNull();
      councilIds.add(persona!.id);
    }
    expect(councilIds.size, "council names are unique personas").toBe(20);
    expect(councilIds.has("soros"), "soros IS a council member (documented)").toBe(true);
    const registryIds = new Set(CANONICAL_PERSONAS.map(p => p.id));
    const excluded = [...registryIds].filter(id => !councilIds.has(id));
    // The ONE documented exclusion: chanos is a chat persona but not a
    // scorer. Changing this set is a methodology decision — it rides in
    // its own PR with the founder, never inside a display fix.
    expect(excluded).toEqual(["chanos"]);
  });

  it("the client projection mirror stays field-exact for all 21 marketing cards (G10 split invariant)", () => {
    expect(PERSONA_DISPLAY).toHaveLength(CANONICAL_PERSONAS.length);
    const byId = new Map(PERSONA_DISPLAY.map(p => [p.id, p]));
    for (const p of CANONICAL_PERSONAS) {
      const d = byId.get(p.id);
      expect(d, `projection carries ${p.id}`).toBeDefined();
      // rank now rides the projection for every marketing card incl.
      // chanos/soros (the 19-split's root cause).
      expect(d!.rank).toBe(p.rank);
      expect(d!.label).toBe(p.label);
      expect(d!.bio).toBe(p.bio);
      expect(d!.formula).toBe(p.formula);
      expect(d!.quote).toBe(p.quote);
      expect(d!.origin).toBe(p.origin);
      expect(d!.category).toBe(p.category);
    }
  });
});
