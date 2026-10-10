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
import { changeKeyOf } from "@/lib/intelligence/insightCache";
import { ReadyComposition } from "@/components/intelligence/ReadyComposition";
import { AskRishi } from "@/components/stock/AskRishi";

export const metadata: Metadata = {
  title: "Evidence fixtures (internal verification)",
  robots: { index: false, follow: false },
};

export default function EvidenceFixturesPage() {
  // INT-D3 mount verification (founder direction, 2026-10-10): the Ask
  // Rishi affordance's ready-state mount needs a changeKey-bearing
  // artifact, and the live stock page honestly renders the dossier ABSENT
  // pre-window (the designed 404). The sanctioned fixture surface proves
  // the mount instead: the ONE deterministic change key (the A7
  // derivation — never a hand-rolled key) computed over the A1-parsed
  // conflict fixture anchors the REAL affordance component. Asking posts
  // to the ONE /api/chat; a fixture key resolves no artifact, so the
  // route refuses and the refusal renders as the refusal it is — an
  // answer from a fixture key would be seed data standing in for live
  // intelligence, and the CI pin fails the tree that ever allows it.
  const mountRaw = EVIDENCE_FIXTURES.conflictWithContradictions;
  const mountInsight = parseRishiInsight(mountRaw);
  const mountKey = mountInsight
    ? changeKeyOf({
        feature: mountInsight.feature,
        subject: mountInsight.subject,
        changeIds: mountInsight.evidence.map((item) => item.id),
      })
    : null;

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
      {mountInsight && mountKey && (
        <section data-fixture-ask-rishi>
          <h2>Ask Rishi affordance mount (INT-D3 verification)</h2>
          <p className="insight-surface__empty">
            Fixture mount verification: the reference below is the ONE deterministic
            change key over the canned conflictWithContradictions fixture (the A7
            derivation). Asking posts to the ONE /api/chat; the route will refuse
            it — a fixture key resolves no artifact — and the refusal renders as
            the refusal it is. Seed data never answers.
          </p>
          <AskRishi changeKey={mountKey} symbol={mountInsight.subject} />
        </section>
      )}
    </main>
  );
}
