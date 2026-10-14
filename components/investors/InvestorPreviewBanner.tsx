/**
 * The /investors banner — on every screen (founder round-55 order,
 * words verbatim: "Banner on every screen."). The banner carries the
 * route's three honesty disclosures:
 *  - DEV AND TEST ONLY (the route is gated; production 404s);
 *  - the dataset is a TEST FIXTURE — not filings;
 *  - fundamentals only — no prices, no valuation readings.
 *
 * The marker attribute (INVESTOR_BANNER_MARKER) is machine-counted by
 * test/investors.route.test.ts against the screen count — a screen
 * without its banner fails the suite.
 */

import type { ReactNode } from "react";
import { INVESTOR_BANNER_MARKER } from "@/lib/investors/reviewedFundamentals";

export function InvestorPreviewBanner({ screen }: { screen: string }): ReactNode {
  return (
    <div
      {...{ [INVESTOR_BANNER_MARKER]: screen }}
      role="note"
      aria-label={`Investor preview disclaimer — ${screen}`}
      style={{
        border: "1px solid rgba(245, 158, 11, 0.55)",
        background: "rgba(245, 158, 11, 0.08)",
        color: "var(--text-secondary, #d4d4d8)",
        fontSize: 11,
        lineHeight: 1.6,
        padding: "10px 14px",
        borderRadius: 6,
        margin: "12px 0",
      }}
    >
      <strong>INVESTOR PREVIEW — DEV AND TEST ONLY.</strong> This screen is not
      public. The figures below come from a <strong>test fixture</strong> —
      they are <strong>not filings</strong> and cite no filing pages yet; the
      reviewed filings dataset lands when the company list is confirmed
      (round-56 build). Fundamentals only: <strong>no prices and no valuation
      readings</strong> on this route, by design.
    </div>
  );
}
