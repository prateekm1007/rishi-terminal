'use client';

// components/ui/DisclaimerModal.tsx — Z5 (Round 13): the first-visit
// acceptance modal, extracted from LegalDisclaimer so its ~4 kB of inline
// styles loads with next/dynamic ONLY when a visitor actually needs to
// accept (no 'rishi_disclaimer_v2' in localStorage). Returning visitors —
// the common case — never download it. The footer strip (the persistent
// disclosure) stays static in every page's first load.

interface Props {
  onAccept: () => void;
  /** The route-aware data-source line (shared with the footer strip). */
  sourceLine: string;
}

export function DisclaimerModal({ onAccept, sourceLine }: Props) {
  return (

  <div style={{
    position: 'fixed',
    inset: 0,
    zIndex: 9999,
    background: 'rgba(0,0,0,0.85)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
  }}>
    <div style={{
      background: '#0A0F1C',
      border: '1px solid #D4AF37',
      borderRadius: '8px',
      maxWidth: '560px',
      width: '100%',
      padding: '32px',
      boxShadow: '0 0 40px rgba(212,175,55,0.15)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
        <span style={{ fontSize: '22px' }}>⚠️</span>
        <h2 style={{
          margin: 0,
          color: '#D4AF37',
          fontSize: '16px',
          fontFamily: 'monospace',
          fontWeight: 700,
          letterSpacing: '0.05em',
        }}>
          IMPORTANT DISCLAIMER
        </h2>
      </div>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        marginBottom: '24px',
      }}>
        <div style={{
          background: 'rgba(212,175,55,0.08)',
          border: '1px solid rgba(212,175,55,0.2)',
          borderRadius: '6px',
          padding: '12px 16px',
        }}>
          <p style={{ margin: 0, color: '#CBD5E1', fontSize: '13px', lineHeight: 1.6 }}>
            <strong style={{ color: '#D4AF37' }}>NOT INVESTMENT ADVICE.</strong>{' '}
            Rishi Terminal is an educational research platform. All data, scores, AI insights,
            and analysis are for <strong>informational purposes only</strong> and do not
            constitute financial, investment, legal, or tax advice.
          </p>
        </div>

        <div style={{
          background: 'rgba(212,175,55,0.08)',
          border: '1px solid rgba(212,175,55,0.2)',
          borderRadius: '6px',
          padding: '12px 16px',
        }}>
          <p style={{ margin: 0, color: '#CBD5E1', fontSize: '13px', lineHeight: 1.6 }}>
            <strong style={{ color: '#D4AF37' }}>PAST PERFORMANCE ≠ FUTURE RESULTS.</strong>{' '}
            All stock scores, fundamentals, and technical indicators shown are algorithmic
            opinions — not buy/sell recommendations. Markets carry risk of capital loss.
          </p>
        </div>

        <div style={{
          background: 'rgba(212,175,55,0.08)',
          border: '1px solid rgba(212,175,55,0.2)',
          borderRadius: '6px',
          padding: '12px 16px',
        }}>
          <p style={{ margin: 0, color: '#CBD5E1', fontSize: '13px', lineHeight: 1.6 }}>
            <strong style={{ color: '#D4AF37' }}>DATA SOURCES.</strong>{' '}
            {sourceLine}
            Data may be delayed or incomplete. Always verify from official exchange sources
            before making decisions. Consult a SEBI-registered financial advisor.
          </p>
        </div>
      </div>

      <button
        onClick={onAccept}
        style={{
          width: '100%',
          background: '#D4AF37',
          color: '#000',
          border: 'none',
          borderRadius: '6px',
          padding: '13px 24px',
          fontSize: '14px',
          fontFamily: 'monospace',
          fontWeight: 700,
          letterSpacing: '0.05em',
          cursor: 'pointer',
        }}
      >
        I UNDERSTAND — CONTINUE TO TERMINAL
      </button>

      <p style={{
        margin: '12px 0 0',
        color: '#475569',
        fontSize: '10px',
        textAlign: 'center',
        fontFamily: 'monospace',
      }}>
        By continuing you confirm this is for educational use only.
      </p>
    </div>
  </div>
  );
}
