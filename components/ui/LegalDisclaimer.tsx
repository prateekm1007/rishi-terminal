'use client';

import { useState, useEffect } from 'react';

export function LegalDisclaimer() {
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    try {
      const accepted = localStorage.getItem('rishi_disclaimer_v2');
      if (!accepted) {
        setShowModal(true);
      }
    } catch {
      // localStorage unavailable - show modal
      setShowModal(true);
    }
  }, []);

  const handleAccept = () => {
    try {
      localStorage.setItem('rishi_disclaimer_v2', 'accepted');
    } catch {}
    setShowModal(false);
  };

  return (
    <>
      {/* ── First-visit acceptance modal ── */}
      {showModal && (
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
                  Live data is sourced from NSE India, Yahoo Finance, and Screener.in.
                  Data may be delayed or incomplete. Always verify from official exchange sources
                  before making decisions. Consult a SEBI-registered financial advisor.
                </p>
              </div>
            </div>

            <button
              onClick={handleAccept}
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
      )}

      {/* ── Persistent footer strip on every page ── */}
      <div style={{
        borderTop: '1px solid rgba(212,175,55,0.2)',
        background: '#070B14',
        padding: '8px 24px',
        textAlign: 'center',
        fontSize: '10px',
        color: '#475569',
        lineHeight: 1.5,
        fontFamily: 'monospace',
      }}>
        <span style={{ color: '#D4AF37', fontWeight: 700 }}>⚠️ NOT INVESTMENT ADVICE</span>
        {' · '}
        Educational research tool only. Data from NSE / Yahoo Finance / Screener.in — may be delayed.
        {' · '}
        Past performance ≠ future results.
        {' · '}
        Consult a SEBI-registered advisor before investing.
        {' · '}
        <button
          onClick={() => setShowModal(true)}
          style={{
            background: 'none',
            border: 'none',
            color: '#D4AF37',
            fontSize: '10px',
            fontFamily: 'monospace',
            cursor: 'pointer',
            padding: 0,
            textDecoration: 'underline',
          }}
        >
          Full Disclaimer
        </button>
      </div>
    </>
  );
}