'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getCurrentTier, TIER_CONFIG } from '../lib/premium';
import { useEffect, useState } from 'react';

const NAV_MAIN = [
  { name: 'Dashboard',  href: '/',          icon: 'DB' },
  { name: 'Screener',   href: '/screener',  icon: 'SC' },
  { name: 'Portfolio',  href: '/portfolio', icon: 'PF' },
  { name: 'All Rishis', href: '/rishis',    icon: 'RS' },
  { name: 'News',       href: '/news',      icon: 'NW' },
  { name: 'Pricing',    href: '/pricing',   icon: 'PR' },
];

const NAV_MARKETS = [
  { name: 'Crypto',      href: '/crypto',      icon: 'CR' },
  { name: 'Forex',       href: '/forex',        icon: 'FX' },
  { name: 'Commodities', href: '/commodities',  icon: 'CM' },
  { name: 'Bonds',       href: '/bonds',        icon: 'BD' },
  { name: 'Watchlist',   href: '/watchlist',    icon: 'WL' },
];

export function Sidebar() {
  const pathname = usePathname();
  const [tier, setTier] = useState<'seeker' | 'student' | 'disciple'>('seeker');
  const [isDev, setIsDev] = useState(false);

  useEffect(() => {
    const t = getCurrentTier();
    setTier(t);
    try {
      const stored = localStorage.getItem('rishi_tier_v1') || 'seeker';
      if (t === 'disciple' && stored !== 'disciple') setIsDev(true);
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
          RISHI
        </div>
        <div style={{ fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '2px', marginTop: '4px' }}>
          INVESTMENT WISDOM OS
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
            {TIER_CONFIG[tier].name.toUpperCase()}
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
            {TIER_CONFIG[tier].price}
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 10px', overflowY: 'auto' }}>

        <div style={sectionLabel}>MAIN</div>
        {NAV_MAIN.map(item => (
          <Link key={item.name} href={item.href} style={linkStyle(item.href)}>
            <span style={iconStyle(item.href)}>{item.icon}</span>
            {item.name}
          </Link>
        ))}

        <div style={{ ...sectionLabel, marginTop: '16px' }}>MARKETS</div>
        {NAV_MARKETS.map(item => (
          <Link key={item.name} href={item.href} style={linkStyle(item.href)}>
            <span style={iconStyle(item.href)}>{item.icon}</span>
            {item.name}
          </Link>
        ))}

      </nav>

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
          Wisdom over hype.
        </div>
      </div>
    </aside>
  );
}