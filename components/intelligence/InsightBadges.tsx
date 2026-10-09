/**
 * <InsightBadges> (INT-A8) — renders the mapping's badge set: the
 * exact closed vocabulary words (status / confidence / materiality /
 * modelStatus), em dash where the display boundary found nothing
 * (never a fallback word). Pre-registration:
 * docs/intelligence/evidence.md.
 */

import type { EvidenceView } from "@/lib/intelligence/evidence";

export function InsightBadges({ badges }: { badges: EvidenceView["badges"] }) {
  return (
    <ul className="insight-surface__badges">
      {badges.map((b) => (
        <li key={b.kind} className="insight-badge" data-insight-badge={b.kind}>
          {b.value}
        </li>
      ))}
    </ul>
  );
}
