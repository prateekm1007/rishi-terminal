/**
 * /investors — the truthful investor route (founder round-55 order,
 * 13 Oct 2026, words verbatim: "Start the truthful investor route
 * (/investors), dev and test only. [...] Use a test fixture until the
 * company list is confirmed. Nothing on the public site changes.").
 *
 * THE GATE (fail-closed, C2/rule 6): production carries no
 * INVESTORS_ROUTE_DEV env value, so this route 404s there. The page is
 * reachable only in dev (the flag set locally) and in tests (the flag
 * set by the suite). No nav link, no sitemap entry, robots noindex —
 * the public site is unchanged, structurally.
 *
 * THE DATA: the reviewed data file contract
 * (lib/investors/reviewedFundamentals) — every figure carries source,
 * page, date, checked-by and checked-on; the loader refuses unsourced
 * figures and any price/valuation vocabulary. The shipped dataset is
 * the honest TEST FIXTURE (values null — no fabricated numbers; the
 * provenance shape is what is being built).
 *
 * THE BANNER: every screen (the overview + each company detail) renders
 * the InvestorPreviewBanner — machine-counted by the route test.
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import {
  investorsRouteEnabled,
  parseReviewedFundamentals,
  type ReviewedCompany,
  type ReviewedFigure,
} from "@/lib/investors/reviewedFundamentals";
import { INVESTOR_FIXTURE_DATASET } from "@/data/investorFundamentals.fixture";
import { InvestorPreviewBanner } from "@/components/investors/InvestorPreviewBanner";

export const metadata: Metadata = {
  title: "Investor preview (dev and test only) | Rishi Terminal",
  robots: { index: false, follow: false },
};

/** camelCase figure key -> the display label. The reviewed-data-file
 * contract carries machine keys; the label map is presentation. */
const FIGURE_LABELS: Record<string, string> = {
  revenue: "Revenue",
  roce: "ROCE",
  debtToEquity: "Debt / Equity",
};

function figureLabel(key: string): string {
  return FIGURE_LABELS[key] ?? key;
}

/** One figure row: value (or the honest "—") + the full provenance line
 * (source · page · date · checked-by · checked-on) — the founder's
 * per-figure disclosure, rendered for every figure. */
function FigureRow({ companySymbol, figureKey, fig }: {
  companySymbol: string;
  figureKey: string;
  fig: ReviewedFigure;
}): ReactNode {
  const valueText = fig.value === null ? "—" : `${fig.value.toLocaleString("en-IN")} ${fig.unit}`;
  return (
    <tr data-investor-figure={`${companySymbol}.${figureKey}`}>
      <th scope="row" style={{ textAlign: "left", paddingRight: 16, fontWeight: 600 }}>
        {figureLabel(figureKey)}
      </th>
      <td style={{ paddingRight: 16, fontVariantNumeric: "tabular-nums" }}>{valueText}</td>
      <td style={{ fontSize: 11, color: "var(--text-muted, #71717a)" }}>
        {fig.source} · p. {fig.sourcePage} · document date {fig.sourceDate} · checked by{" "}
        {fig.checkedBy} on {fig.checkedOn}
      </td>
    </tr>
  );
}

function CompanyScreen({ company }: { company: ReviewedCompany }): ReactNode {
  return (
    <section data-investor-screen={`company-${company.symbol}`} aria-label={`${company.name} fundamentals`}>
      <InvestorPreviewBanner screen={`company-${company.symbol}`} />
      <h2 style={{ fontSize: 18, marginBottom: 4 }}>
        {company.name} ({company.symbol})
      </h2>
      <p style={{ fontSize: 12, color: "var(--text-muted, #71717a)", marginTop: 0 }}>
        {company.sector} · {company.fiscalYear} · figures from the reviewed data file
      </p>
      <table style={{ borderCollapse: "collapse", fontSize: 13 }}>
        <tbody>
          {Object.entries(company.figures).map(([key, fig]) => (
            <FigureRow key={key} companySymbol={company.symbol} figureKey={key} fig={fig} />
          ))}
        </tbody>
      </table>
    </section>
  );
}

export default function InvestorsPage(): ReactNode {
  // The gate: fail-closed. Production (no flag) gets the 404 — the
  // public site is unchanged.
  if (!investorsRouteEnabled()) notFound();

  // The reviewed-data-file boundary: refuse-and-disclose, never partial.
  const parsed = parseReviewedFundamentals(INVESTOR_FIXTURE_DATASET);
  if (!parsed.ok) {
    return (
      <main style={{ maxWidth: 760, margin: "0 auto", padding: "32px 20px" }}>
        <h1>Investor preview — data refused</h1>
        <InvestorPreviewBanner screen="refused" />
        <p role="alert" style={{ color: "#f87171" }}>{parsed.error}</p>
        <p style={{ fontSize: 12, color: "var(--text-muted, #71717a)" }}>
          The reviewed data file failed its contract check. Nothing is rendered
          from it. Fix the file; do not relax the check.
        </p>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "32px 20px" }}>
      <section data-investor-screen="overview" aria-label="Investor preview overview">
        <InvestorPreviewBanner screen="overview" />
        <h1 style={{ fontSize: 22, marginBottom: 8 }}>Investor preview — fundamentals, cited</h1>
        <p style={{ fontSize: 13, color: "var(--text-secondary, #d4d4d8)", lineHeight: 1.7 }}>
          The investor view shows company fundamentals from a reviewed data
          file: every figure carries its source, page, date, checked-by and
          checked-on. Prices and valuation readings are deliberately absent —
          the exchange-data licence is pending, and this route tells the truth
          about what it does and does not show.
        </p>
        <ul style={{ fontSize: 13, lineHeight: 1.8 }}>
          {parsed.companies.map((c) => (
            <li key={c.symbol}>
              <a href={`#company-${c.symbol}`}>{c.name} ({c.symbol})</a>
            </li>
          ))}
        </ul>
      </section>

      {parsed.companies.map((company) => (
        <div key={company.symbol} id={`company-${company.symbol}`} style={{ marginTop: 28 }}>
          <CompanyScreen company={company} />
        </div>
      ))}
    </main>
  );
}
