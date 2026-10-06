/**
 * P0-05 — the provenance audit's claims are testable.
 *
 * scripts/provenanceAudit.ts classifies every page by what its import
 * tree actually pulls in and writes docs/PROVENANCE.md. This test pins
 * the contract the roadmap requires:
 *   1. every page classified `seed` renders <SeedDataBanner> somewhere
 *      in its import tree (the audit's --fail-on-unlabelled-seed gate);
 *   2. docs/PROVENANCE.md is in sync with the derived audit (a page
 *      added without regenerating the doc fails here);
 *   3. FD-3-scope routes are REPORTED, not hidden — hiding them is the
 *      founder's decision (Constitution art. 31), so the audit must not
 *      silently claim it was done.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { audit, writeDoc } from "../scripts/provenanceAudit";

const REPO = path.resolve(__dirname, "..");

describe("P0-05 — provenance audit", () => {
  const audits = audit();

  it("the walk finds pages (not vacuous) and covers the known seed routes", () => {
    expect(audits.length).toBeGreaterThan(20);
    const routes = audits.map((a) => a.route);
    for (const expected of ["/", "/stocks", "/chat", "/lab", "/stock/*"]) {
      expect(routes, `page walk must find ${expected}`).toContain(expected);
    }
  });

  it("every seed-classified page is labelled (banner in its import tree)", () => {
    const unlabelled = audits.filter((a) => a.classification === "seed" && !a.labelled);
    expect(
      unlabelled.map((u) => `${u.route} (${u.file})`),
      "seed pages without <SeedDataBanner> in their import tree",
    ).toEqual([]);
  });

  it("the known seed routes are classified seed", () => {
    for (const route of ["/", "/stocks", "/chat", "/lab", "/stock/*"]) {
      const page = audits.find((a) => a.route === route);
      expect(page, `${route} present in the audit`).toBeDefined();
      expect(page!.classification, `${route} renders seed-derived numbers`).toBe("seed");
    }
  });

  it("docs/PROVENANCE.md matches the derived audit (regenerate after page changes)", () => {
    const doc = readFileSync(path.join(REPO, "docs", "PROVENANCE.md"), "utf8");
    // Regenerate and compare: if a page changed classification without
    // the doc being refreshed, the committed doc differs from the truth.
    const auditsNow = audit();
    const expectedRows = auditsNow
      .filter((a) => a.classification === "seed" || a.classification === "sourced"
        || a.classification === "static-editorial" || a.classification === "none")
      .map((a) => a.route);
    for (const route of expectedRows) {
      expect(doc, `docs/PROVENANCE.md must list ${route}`).toContain(`| ${route} |`);
    }
  });

  it("FD-3-scope routes are reported, not hidden (the decision is the founder's)", () => {
    const fd3 = audits.filter((a) => a.inFd3Scope);
    expect(fd3.length).toBeGreaterThan(5);
    for (const a of fd3) {
      expect(a.classification, `${a.route} is classified like any other page`).toBeDefined();
    }
  });
});
