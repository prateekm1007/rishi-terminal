'use client';

/**
 * LicencePendingNote — the FD-26 label on a withheld price-based score
 * (founder default, 11 Oct 2026, recorded in ROADMAP): "licence pending"
 * is the canonical label every price-based score surface carries while
 * the exchange-data licence is unresolved.
 *
 * Rendered in the QVPS absent state on the stock page (the dual gauge is
 * a price-based score — P/E, P/B, market cap — and is not produced while
 * the licence is pending, mirroring the scorers' licenseRefusal which
 * carries the same label).
 */
import { PRICE_SCORES_LABEL } from '@/lib/licensing';

export default function LicencePendingNote() {
  return (
    <div
      data-testid="licence-pending-note"
      role="note"
      style={{
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.04em',
        color: '#f59e0b',
        background: 'rgba(245,158,11,0.08)',
        border: '1px solid rgba(245,158,11,0.35)',
        borderRadius: 6,
        padding: '8px 12px',
        marginBottom: 12,
      }}
    >
      {PRICE_SCORES_LABEL} — the Quality-Value Pillar Score reads price-derived
      inputs (P/E, P/B, market capitalisation) and is not published while the
      exchange-data licence is pending (NSE display / non-display enquiry,
      sent for a written answer); until it arrives it is own-use only.
    </div>
  );
}
