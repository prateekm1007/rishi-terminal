'use client';

import Link from 'next/link';
import { useLanguage } from '../../lib/language';

/**
 * /pricing — the honest access page (Commit M4, founder decision
 * 2026-10-02: every feature free).
 *
 * The paid-tier storefront (Seeker / Student ₹499 / Disciple ₹1,999,
 * upgrade buttons, Razorpay checkout) is retired. This page now answers
 * the only question a visitor can still arrive with — "what does it
 * cost?" — with the truth: nothing. There are no plans, no tiers, and no
 * checkout; an automated test (test/freeAccess.contract.test.ts) fails
 * if tier names, rupee subscription prices, upgrade CTAs or checkout
 * invocations ever return to this file.
 */
export default function PricingPage() {
  const { t } = useLanguage();

  const features: Array<{ icon: string; label: string }> = [
    { icon: '🧘', label: t('pricing.free.allRishis') },
    { icon: '💬', label: t('pricing.free.aiChat') },
    { icon: '📊', label: t('pricing.free.screener') },
    { icon: '📈', label: t('pricing.free.portfolio') },
    { icon: '🧠', label: t('pricing.free.knowledgeGraph') },
    { icon: '⚡', label: t('pricing.free.livePrices') },
  ];

  return (
    <main className="page-bg">
      <div className="page-header">
        <div className="content-wrapper" style={{ padding: '0 24px' }}>
          <p style={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: 'var(--text-muted)', marginBottom: 16, letterSpacing: 2 }}>
            <Link href="/" style={{ color: 'var(--accent-gold)', textDecoration: 'none' }}>RISHI TERMINAL</Link>
            {' > '}
            <span>{t('pricing.breadcrumb')}</span>
          </p>

          <h1 style={{ fontFamily: 'Cinzel, serif', fontSize: 38, color: 'var(--text-primary)', letterSpacing: 2, marginBottom: 8 }}>
            {t('pricing.free.title')}
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 600, lineHeight: 1.7, marginBottom: 16 }}>
            {t('pricing.free.subtitle')}
          </p>
        </div>
      </div>

      <div className="content-wrapper" style={{ padding: '48px 24px' }}>

        <div
          className="card-sacred"
          style={{
            padding: 40,
            textAlign: 'center',
            maxWidth: 720,
            margin: '0 auto 40px',
            border: '1px solid rgba(212,175,55,0.35)',
          }}
        >
          <div style={{ fontSize: 44, marginBottom: 16 }}>🕯️</div>
          <div style={{ fontFamily: 'Cinzel, serif', fontSize: 40, fontWeight: 700, color: 'var(--accent-gold)', marginBottom: 8, letterSpacing: 2 }}>
            {t('pricing.free.price')}
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 520, margin: '0 auto 24px', lineHeight: 1.7 }}>
            {t('pricing.free.body')}
          </p>
          <Link
            href="/rishis"
            style={{
              display: 'inline-block',
              padding: '13px 30px',
              background: 'linear-gradient(135deg, #A88B20, #D4AF37)',
              color: '#0A0F1C',
              borderRadius: 10,
              fontWeight: 700,
              fontSize: 14,
              textDecoration: 'none',
              letterSpacing: 1,
            }}
          >
            {t('pricing.free.cta')}
          </Link>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14, maxWidth: 900, margin: '0 auto' }}>
          {features.map((f) => (
            <div key={f.label} className="card-sacred" style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 20 }}>{f.icon}</span>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{f.label}</span>
            </div>
          ))}
        </div>

        <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', marginTop: 32, fontStyle: 'italic' }}>
          {t('pricing.free.signUpNote')}
        </p>
      </div>
    </main>
  );
}
