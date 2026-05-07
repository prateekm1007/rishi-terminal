'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { TIER_CONFIG, getCurrentTier, setTier, type WisdomTier } from '../../lib/premium';
import { useLanguage } from '../../lib/language';

export default function PricingPage() {
  const { t } = useLanguage();
  const [currentTier, setCurrentTierState] = useState<WisdomTier>('seeker');

  useEffect(() => {
    setCurrentTierState(getCurrentTier());
  }, []);

  const handleUpgrade = (tier: WisdomTier) => {
    if (tier === 'seeker') return;
    setTier(tier);
    setCurrentTierState(tier);
    alert(`Welcome to ${TIER_CONFIG[tier].label}! Your wisdom tier has been upgraded.`);
  };

  const tiers: WisdomTier[] = ['seeker', 'student', 'disciple'];

  const tierColors: Record<WisdomTier, string> = {
    seeker: '#71767B',
    student: '#FFD700',
    disciple: '#c084fc',
  };

  const tierEmoji: Record<WisdomTier, string> = {
    seeker: 'O',
    student: 'S',
    disciple: 'D',
  };

  return (
    <main className="page-container">
      <div className="page-header">
        <div className="content-wrapper" style={{ padding: '0 24px' }}>
          <p style={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: 'var(--text-muted)', marginBottom: 16, letterSpacing: 2 }}>
            <Link href="/" style={{ color: 'var(--accent-gold)', textDecoration: 'none' }}>RISHI TERMINAL</Link>
            {' > '}
            <span>{t('pricing.breadcrumb')}</span>
          </p>

          <h1 style={{ fontFamily: 'Cinzel, serif', fontSize: 38, color: 'var(--text-primary)', letterSpacing: 2, marginBottom: 8 }}>
            {t('pricing.title')}
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 600, lineHeight: 1.7, marginBottom: 16 }}>
            {t('pricing.subtitle')}
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>
            &ldquo;{t('pricing.benjaminFranklin')}&rdquo; &mdash; {t('pricing.franklinAuthor')}
          </p>
        </div>
      </div>

      <div className="content-wrapper" style={{ padding: '48px 24px' }}>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 24, marginBottom: 48 }}>
          {tiers.map(tier => {
            const config = TIER_CONFIG[tier];
            const isActive = currentTier === tier;
            const color = tierColors[tier];
            const emoji = tierEmoji[tier];

            return (
              <div key={tier}
                style={{
                  padding: 32,
                  background: isActive ? `${color}08` : 'var(--bg-card)',
                  border: `1px solid ${isActive ? color : 'var(--border-primary)'}`,
                  borderRadius: 16,
                  position: 'relative',
                  transition: 'all 0.3s ease',
                }}
              >
                {isActive && (
                  <div style={{
                    position: 'absolute',
                    top: -12,
                    right: 20,
                    background: color,
                    color: '#000',
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: 1,
                    padding: '4px 12px',
                    borderRadius: 20,
                  }}>
                    {t('pricing.currentTier')}
                  </div>
                )}

                <div style={{ fontSize: 32, marginBottom: 12 }}>{emoji}</div>

                <h2 style={{
                  fontFamily: 'Cinzel, serif',
                  fontSize: 24,
                  color: color,
                  marginBottom: 8,
                  letterSpacing: 2,
                }}>
                  {config.label}
                </h2>

                <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 24 }}>
                  {config.price}
                </div>

                <div style={{ marginBottom: 32 }}>
                  {config.features.map((f, i) => (
                    <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 12 }}>
                      <span style={{ color: color, fontWeight: 700, marginTop: 1, flexShrink: 0 }}>+</span>
                      <span style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{f}</span>
                    </div>
                  ))}
                </div>

                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 16 }}>
                  {config.rishisVisible === 20
                    ? `All 20 ${t('pricing.rishisVisible')}`
                    : `${config.rishisVisible} ${t('pricing.rishisVisible')}`}
                  {' · '}
                  {config.dailyViews
                    ? `${config.dailyViews} ${t('pricing.viewsPerDay')}`
                    : t('pricing.unlimitedViews')}
                </div>

                {tier === 'seeker' ? (
                  <div style={{
                    width: '100%',
                    padding: '12px',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-muted)',
                    border: '1px solid var(--border-primary)',
                    borderRadius: 8,
                    textAlign: 'center',
                    fontSize: 13,
                  }}>
                    {isActive ? t('pricing.yourCurrentTier') : t('pricing.freeForever')}
                  </div>
                ) : (
                  <button
                    onClick={() => handleUpgrade(tier)}
                    disabled={isActive}
                    style={{
                      width: '100%',
                      padding: '14px',
                      background: isActive ? `${color}30` : color,
                      color: isActive ? color : '#000',
                      border: `1px solid ${color}`,
                      borderRadius: 8,
                      fontWeight: 700,
                      fontSize: 14,
                      cursor: isActive ? 'default' : 'pointer',
                      fontFamily: 'Cinzel, serif',
                      letterSpacing: 1,
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {isActive ? t('pricing.active') : `${t('pricing.becomeA')} ${config.label}`}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div className="card" style={{ padding: 32, textAlign: 'center' }}>
          <div style={{ fontFamily: 'Cinzel, serif', fontSize: 18, color: 'var(--accent-gold)', marginBottom: 12 }}>
            {t('pricing.guarantee')}
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 600, margin: '0 auto', lineHeight: 1.7 }}>
            {t('pricing.guaranteeText')}
          </p>
          <div style={{ marginTop: 24, fontSize: 12, color: 'var(--text-muted)' }}>
            {t('pricing.localStorage')}
          </div>
        </div>

      </div>
    </main>
  );
}