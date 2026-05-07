'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getCurrentTier, TIER_CONFIG } from '../lib/premium';
import { useLanguage } from '../lib/language';
import { LanguageSelector } from './LanguageSelector';
import { useEffect, useState } from 'react';

export function Sidebar() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const [tier, setTier] = useState<'seeker' | 'student' | 'disciple'>('seeker');
  const [isDev, setIsDev] = useState(false);

  useEffect(() => {
    const currentTier = getCurrentTier();
    setTier(currentTier);
    try {
      const stored = localStorage.getItem('rishi_tier_v1') || 'seeker';
      if (currentTier === 'disciple' && stored !== 'disciple') setIsDev(true);
    } catch {}
  }, []);

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname?.startsWith(href) ?? false;

  const linkStyle = (href: string) => ({
    display: 'flex' as const,
    alignItems: 'center' as const,
    gap: '10px',
    padding: '8px 10px',
    borderRadius: '6px',
    marginBottom: '2px',
    textDecoration: 'none',
    fontSize: '13px',
    fontWeight: isActive(href) ? 600 : 400,
    background: isActive(href) ? 'rgba(255,215,0,0.1)' : 'transparent',
    color: isActive(href) ? 'var(--accent-gold)' : 'var(--text-secondary)',
    border: isActive(href) ? '1px solid rgba(255,215,0,0.25)' : '1px solid transparent',
    transition: 'all 0.15s ease',
  });

  const iconStyle = (href: string) => ({
    width: '26px',
    height: '20px',
    fontSize: '9px',
    fontFamily: 'monospace',
    color: isActive(href) ? 'var(--accent-gold)' : 'var(--text-muted)',
    letterSpacing: '0.5px',
    display: 'flex' as const,
    alignItems: 'center' as const,
  });

  const sectionLabel = {
    fontSize: '9px',
    color: 'var(--text-muted)',
    letterSpacing: '2px',
    padding: '0 8px',
    marginBottom: '6px',
    marginTop: '4px',
  };

  const NAV_MAIN = [
    { key: 'dashboard',  href: '/',            icon: 'DB' },
    { key: 'screener',   href: '/screener',    icon: 'SC' },
    { key: 'portfolio',  href: '/portfolio',   icon: 'PF' },
    { key: 'allRishis',  href: '/rishis',      icon: 'RS' },
    { key: 'news',       href: '/news',        icon: 'NW' },
    { key: 'pricing',    href: '/pricing',     icon: 'PR' },
  ];

  const NAV_MARKETS = [
    { key: 'crypto',       href: '/crypto',       icon: 'CR' },
    { key: 'forex',        href: '/forex',         icon: 'FX' },
    { key: 'commodities',  href: '/commodities',   icon: 'CM' },
    { key: 'bonds',        href: '/bonds',         icon: 'BD' },
    { key: 'watchlist',    href: '/watchlist',     icon: 'WL' },
  ];

  return (
    <aside className="sidebar-desktop" style={{
      width: '220px',
      minWidth: '220px',
      height: '100vh',
      position: 'sticky',
      top: 0,
      background: 'var(--bg-secondary)',
      borderRight: '1px solid var(--border-primary)',
      display: 'flex',
      flexDirection: 'column',
      overflowY: 'auto',
      zIndex: 40,
    }}>

      {/* Logo */}
      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--border-primary)' }}>
        <div className="philosophy-heading" style={{ fontSize: '22px', color: 'var(--accent-gold)', letterSpacing: '3px' }}>
          {t('header.title')}
        </div>
        <div style={{ fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '2px', marginTop: '4px' }}>
          {t('header.investmentWisdomOS')}
        </div>

        {isDev && (
          <div style={{
            marginTop: '10px',
            padding: '3px 8px',
            background: 'rgba(255,215,0,0.1)',
            border: '1px solid rgba(255,215,0,0.4)',
            borderRadius: '4px',
            fontSize: '10px',
            color: 'var(--accent-gold)',
            fontFamily: 'monospace',
            letterSpacing: '1px',
          }}>
            DEV MODE
          </div>
        )}

        <div style={{
          marginTop: '10px',
          padding: '8px 10px',
          background: 'rgba(255,215,0,0.06)',
          border: '1px solid rgba(255,215,0,0.2)',
          borderRadius: '6px',
        }}>
          <div style={{ fontSize: '11px', color: 'var(--accent-gold)', fontWeight: 600, letterSpacing: '1px' }}>
            {t(`tiers.${tier}`).toUpperCase()}
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
            {TIER_CONFIG[tier].price}
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 10px', overflowY: 'auto' }}>

        <div style={sectionLabel}>{t('nav.main')}</div>
        {NAV_MAIN.map(item => (
          <Link key={item.key} href={item.href} style={linkStyle(item.href)}>
            <span style={iconStyle(item.href)}>{item.icon}</span>
            {t(`nav.${item.key}`)}
          </Link>
        ))}

        <div style={{ ...sectionLabel, marginTop: '16px' }}>{t('nav.markets')}</div>
        {NAV_MARKETS.map(item => (
          <Link key={item.key} href={item.href} style={linkStyle(item.href)}>
            <span style={iconStyle(item.href)}>{item.icon}</span>
            {t(`nav.${item.key}`)}
          </Link>
        ))}

      </nav>

      {/* Language Selector */}
      <div style={{
        padding: '12px 10px',
        borderTop: '1px solid var(--border-primary)',
      }}>
        <div style={{
          fontSize: '9px',
          color: 'var(--text-muted)',
          letterSpacing: '2px',
          marginBottom: '8px',
          padding: '0 2px',
        }}>
          {t('language.select').toUpperCase()}
        </div>
        <LanguageSelector />
      </div>

      {/* Footer */}
      <div style={{
        padding: '14px 20px',
        borderTop: '1px solid var(--border-primary)',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '1px' }}>
          RISHI TERMINAL v4.1
        </div>
        <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px', fontStyle: 'italic' }}>
          {t('header.wisdomOverHype')}
        </div>
      </div>
    </aside>
  );
}