// S2-01 — Methodology coverage (Round 13).
//
// Acceptance (roadmap): "every registered scorer id has a doc with all
// required headings."
//
// The registered set is taken from RISHI_WEIGHT_CONFIG (the same
// canonical names the consensus engine's fail-closed weight lookup
// requires — a scorer cannot exist without an entry) and cross-checked
// against the engine's TOTAL_RISHIS.
//
// Slugs are DERIVED (kebab-case), never hand-listed: a scorer without a
// doc fails here and is absent from /methodology until the doc exists.
//
// Rule 21: this test was written and RUN against the pre-doc tree, where
// it failed for every scorer (docs/methodology/ did not exist yet) —
// recorded in the PR.

import { describe, it, expect } from "vitest";
import { readFileSync, existsSync, readdirSync } from "fs";
import path from "path";

import { RISHI_WEIGHT_CONFIG } from "../lib/gurus/weights";
import { scorerSlug, METHODOLOGY_REQUIRED_HEADINGS } from "../lib/methodology/index";
import { TOTAL_RISHIS } from "../lib/consensus/orchestrator";

const DOCS_DIR = path.join(process.cwd(), "docs", "methodology");

describe("S2-01 — every registered scorer has a methodology doc", () => {
  it("the panel is the expected size (guard against registry drift)", () => {
    expect(RISHI_WEIGHT_CONFIG).toHaveLength(20);
    expect(TOTAL_RISHIS).toBe(20);
  });

  it("a doc exists for every scorer, named by the derived slug", () => {
    expect(existsSync(DOCS_DIR)).toBe(true);
    for (const rishi of RISHI_WEIGHT_CONFIG) {
      const slug = scorerSlug(rishi.name);
      const file = path.join(DOCS_DIR, `${slug}.md`);
      expect(existsSync(file), `missing docs/methodology/${slug}.md for scorer "${rishi.name}"`).toBe(true);
    }
  });

  it("every scorer doc carries ALL required headings (H2, exact)", () => {
    for (const rishi of RISHI_WEIGHT_CONFIG) {
      const file = path.join(DOCS_DIR, `${scorerSlug(rishi.name)}.md`);
      const raw = readFileSync(file, "utf-8");
      const h2s = raw
        .split("\n")
        .map((l) => /^##\s+(.*)$/.exec(l.trim()))
        .filter((m): m is RegExpExecArray => m !== null)
        .map((m) => m[1].trim());
      for (const required of METHODOLOGY_REQUIRED_HEADINGS) {
        expect(
          h2s.includes(required),
          `${path.basename(file)}: missing required H2 heading "${required}" (has: ${h2s.join(" | ")})`,
        ).toBe(true);
      }
    }
  });

  it("each doc's H1 names the scorer, and the published tier/weight appear in it", () => {
    for (const rishi of RISHI_WEIGHT_CONFIG) {
      const file = path.join(DOCS_DIR, `${scorerSlug(rishi.name)}.md`);
      const raw = readFileSync(file, "utf-8");
      const h1 = raw.split("\n").map((l) => /^#\s+(.*)$/.exec(l.trim())).find((m) => m !== null);
      expect(h1 !== null, `${path.basename(file)}: no H1 title`).toBe(true);
      expect(h1![1]).toContain(rishi.name);
      // the doc states the tier and weight from the published config
      expect(raw).toContain(rishi.tier);
      expect(raw).toContain(String(rishi.weight));
    }
  });

  it("no orphan docs (every doc maps to a registered scorer or a documented metric)", () => {
    const known = new Set([
      ...RISHI_WEIGHT_CONFIG.map((r) => scorerSlug(r.name)),
      "dispersion", // S2-06's metric doc
      "readme",     // the methodology index/README (if present)
    ]);
    for (const f of readdirSync(DOCS_DIR)) {
      if (!f.endsWith(".md")) continue;
      const slug = f.replace(/\.md$/, "").toLowerCase();
      expect(
        known.has(slug),
        `docs/methodology/${f} does not map to any registered scorer (orphan doc)`,
      ).toBe(true);
    }
  });
});
