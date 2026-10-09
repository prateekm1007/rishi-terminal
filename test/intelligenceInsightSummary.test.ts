import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { readFileSync } from "node:fs";
import { buildEvidenceView } from "@/lib/intelligence/evidence";
import { parseRishiInsight, type RishiInsight } from "@/lib/intelligence/types";
import { EVIDENCE_FIXTURES } from "@/lib/intelligence/evidenceFixtures";
import { InsightSummary } from "@/components/intelligence";

/**
 * INT-A8-PRES — <InsightSummary>, the ONE new shared primitive: the
 * artifact's prose rendered verbatim as labelled, deterministic/
 * model-status-appropriate content. Pre-registration:
 * docs/intelligence/evidencePresentation.md (PR #301) — the pinned
 * composition grows to SIX steps (InsightBadges → InsightSummary →
 * ProvenanceLine → ContradictionBanner → EvidenceList →
 * UncertaintyBlock); the barrel comment demands amending the
 * pre-registration in the same PR, and the pre-registration IS this
 * PR's contract.
 *
 * Honesty pins: the numbers in `whatChanged` are the deterministic
 * layer's own strings rendered verbatim (never composed in JSX); the
 * prose is NEVER labelled AI-generated (the provenance line is the
 * single honesty carrier); no advice strings.
 *
 * Rule 21 fail-first: on the pre-implementation tree the primitive
 * does not exist — this file fails at import (the A3..A10 precedent).
 */

const DETERMINISTIC = parseRishiInsight(EVIDENCE_FIXTURES.deterministicProvenance) as RishiInsight;

describe("<InsightSummary> — the artifact's prose, verbatim and labelled", () => {
  it("renders the summary and whyItMatters paragraphs verbatim under their labels", async () => {
    const view = buildEvidenceView(DETERMINISTIC);
    const html = renderToString(createElement(InsightSummary, { view }));
    expect(html).toContain("Summary");
    expect(html).toContain("The price moved during the window; both sources agree.");
    expect(html).toContain("Why it matters");
    expect(html).toContain("An agreed price move is the baseline every downstream judgement starts from.");
  });

  it("renders the whatChanged lines verbatim (field: change — the deterministic layer's own strings)", async () => {
    const view = buildEvidenceView(DETERMINISTIC);
    const html = renderToString(createElement(InsightSummary, { view }));
    expect(html).toContain("What changed");
    expect(html).toContain("price: 3100.0 inr -> 3105.5 inr");
  });

  it("an empty whatChanged renders the honest empty state, never a fabricated change", async () => {
    const view = buildEvidenceView({ ...DETERMINISTIC, whatChanged: [] } as unknown as RishiInsight);
    const html = renderToString(createElement(InsightSummary, { view }));
    expect(html).toContain("No tracked change in the window.");
  });

  it("carries the audit data attributes and the summary block class", async () => {
    const view = buildEvidenceView(DETERMINISTIC);
    const html = renderToString(createElement(InsightSummary, { view }));
    expect(html).toContain('class="insight-surface insight-surface--summary"');
    expect(html).toContain('data-insight-summary="summary"');
    expect(html).toContain('data-insight-summary="whyItMatters"');
    expect(html).toContain('data-insight-summary="whatChanged"');
    expect(html).toContain('data-insight-what-changed-field="price"');
  });

  it("never labels the deterministic prose AI-generated and never advises", async () => {
    const view = buildEvidenceView(DETERMINISTIC);
    const html = renderToString(createElement(InsightSummary, { view }));
    for (const banned of ["AI-generated", "AI generated", "model-generated", "BUY", "SELL", "HOLD"]) {
      expect(html).not.toContain(banned);
    }
  });

  it("the barrel exports exactly the six closed primitives (the composition's canonical order pinned at the barrel)", () => {
    const src = readFileSync("components/intelligence/index.ts", "utf8");
    for (const name of [
      "InsightBadges",
      "InsightSummary",
      "ProvenanceLine",
      "ContradictionBanner",
      "EvidenceList",
      "UncertaintyBlock",
    ]) {
      expect(src).toContain(name);
    }
  });
});
