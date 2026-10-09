/**
 * /evidence-fixtures (INT-A8, founder scope 2026-10-09) — the
 * non-indexed fixture route: renders the A8 primitives over the ONE
 * canned fixture source for Playwright/production verification.
 * Zero product-surface change; Phase B–J features do the mounting.
 * Pre-registration: docs/intelligence/evidence.md.
 *
 * Parse-or-refuse at the boundary: every fixture is parsed through the
 * ONE A1 parser; a fixture that fails the parse renders the honest
 * refusal state (and the CI fixture-parsing test is red) — never a
 * runtime guess. No product surface links here; robots disallows the
 * path; metadata forbids indexing.
 */

import type { Metadata } from "next";
import { parseRishiInsight } from "@/lib/intelligence/types";
import { buildEvidenceView } from "@/lib/intelligence/evidence";
import { EVIDENCE_FIXTURES } from "@/lib/intelligence/evidenceFixtures";
import { ReadyComposition } from "@/components/intelligence/ReadyComposition";

export const metadata: Metadata = {
  title: "Evidence fixtures (internal verification)",
  robots: { index: false, follow: false },
};

export default function EvidenceFixturesPage() {
  return (
    <main>
      <h1>Evidence / Uncertainty / Contradiction — closed-state fixtures</h1>
      {Object.entries(EVIDENCE_FIXTURES).map(([name, raw]) => {
        const insight = parseRishiInsight(raw);
        if (!insight) {
          return (
            <section key={name} data-fixture-refused={name}>
              <h2>{name}</h2>
              <p className="insight-surface__empty">
                Fixture refused by the contract parser — nothing rendered.
              </p>
            </section>
          );
        }
        const view = buildEvidenceView(insight);
        return (
          <section key={name} data-fixture={name}>
            <h2>{name}</h2>
            <ReadyComposition view={view} />
          </section>
        );
      })}
    </main>
  );
}
