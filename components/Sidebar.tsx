'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const navSections = [
    {
      title: 'CORE',
      items: [
        { href: '/', label: 'Dashboard', icon: '📊' },
        { href: '/screener', label: 'Stock Screener', icon: '🔍' },
      ],
    },
    {
      title: 'EQUITIES',
      items: [
        { href: '/rishis', label: 'All Rishis', icon: '🧘' },
        { href: '/portfolio', label: 'Portfolio', icon: '💼' },
        { href: '/watchlist', label: 'Watchlist', icon: '⭐' },
        { href: '/compare', label: 'Compare', icon: '⚖️' },
      ],
    },
    {
      title: 'BONDS',
      items: [
        { href: '/bonds', label: 'Bond Market', icon: '🏛️' },
        { href: '/bonds/screener', label: 'Bond Screener', icon: '📋' },
        { href: '/bonds/rishis', label: 'Bond Rishis', icon: '💎' },
      ],
    },
    {
      title: 'FOREX',
      items: [
        { href: '/forex', label: 'Forex Dashboard', icon: '💱' },
        { href: '/forex/pairs', label: 'Currency Pairs', icon: '🌍' },
        { href: '/forex/rishis', label: 'Forex Rishis', icon: '🗿' },
      ],
    },
    {
      title: 'MULTI-ASSET',
      items: [
        { href: '/crypto', label: 'Crypto Rishis', icon: '₿' },
        { href: '/commodities', label: 'Commodities', icon: '🛢️' },
      ],
    },
    {
      title: 'RESEARCH',
      items: [
        { href: '/news', label: 'Market News', icon: '📰' },
      ],
    },
  ];

  return (
    <aside
      style={{
        width: collapsed ? '72px' : '260px',
        minWidth: collapsed ? '72px' : '260px',
        background: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border-primary)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.25s ease, min-width 0.25s ease',
        position: 'sticky',
        top: 0,
        height: '100vh',
        overflowY: 'auto',
        overflowX: 'hidden',
        scrollbarWidth: 'none',
      }}
    >
      <div style={{
        padding: collapsed ? '20px 12px' : '24px 20px',
        borderBottom: '1px solid var(--border-primary)',
        flexShrink: 0,
      }}>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <div style={{
            fontFamily: 'Cinzel, serif',
            fontSize: collapsed ? '14px' : '18px',
            color: 'var(--accent-gold)',
            letterSpacing: 2,
            fontWeight: 700,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textAlign: collapsed ? 'center' : 'left',
          }}>
            {collapsed ? 'RT' : 'RISHI TERMINAL'}
          </div>
        </Link>
        {!collapsed && (
          <div style={{
            fontSize: '9px',
            color: 'var(--text-muted)',
            marginTop: '6px',
            fontFamily: 'JetBrains Mono',
            letterSpacing: 1.5,
          }}>
            MULTI-ASSET WISDOM OS
          </div>
        )}
      </div>

      <button
        onClick={() => setCollapsed(!collapsed)}
        style={{
          background: 'transparent',
          border: '1px solid var(--border-primary)',
          color: 'var(--text-muted)',
          padding: '6px 10px',
          margin: '10px',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '11px',
          fontFamily: 'JetBrains Mono',
          alignSelf: 'flex-end',
          flexShrink: 0,
        }}
      >
        {collapsed ? '→' : '←'}
      </button>

      <nav style={{
        flex: 1,
        padding: collapsed ? '0 8px' : '0 12px',
        overflowY: 'auto',
        scrollbarWidth: 'none',
      }}>
        {navSections.map((section) => (
          <div key={section.title} style={{ marginBottom: '28px' }}>
            {!collapsed && (
              <div style={{
                fontSize: '9px',
                fontFamily: 'JetBrains Mono',
                color: 'var(--text-muted)',
                marginBottom: '8px',
                letterSpacing: 2,
                fontWeight: 700,
                paddingLeft: '8px',
              }}>
                {section.title}
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {section.items.map((item) => {
                const isActive = item.href === '/' 
                  ? pathname === '/' 
                  : pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: collapsed ? '0' : '10px',
                      padding: collapsed ? '10px 0' : '9px 12px',
                      borderRadius: '8px',
                      background: isActive ? 'rgba(245,158,11,0.12)' : 'transparent',
                      color: isActive ? 'var(--accent-gold)' : 'var(--text-secondary)',
                      textDecoration: 'none',
                      fontSize: '13px',
                      fontWeight: isActive ? 600 : 400,
                      transition: 'all 0.15s ease',
                      justifyContent: collapsed ? 'center' : 'flex-start',
                      borderLeft: isActive ? '2px solid var(--accent-gold)' : '2px solid transparent',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <span style={{ fontSize: '16px', flexShrink: 0 }}>{item.icon}</span>
                    {!collapsed && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div style={{
        padding: collapsed ? '14px 8px' : '14px 20px',
        borderTop: '1px solid var(--border-primary)',
        fontSize: '9px',
        color: 'var(--text-muted)',
        fontFamily: 'JetBrains Mono',
        textAlign: collapsed ? 'center' : 'left',
        flexShrink: 0,
        letterSpacing: 1,
      }}>
        {collapsed ? 'v4' : 'Rishi Terminal v4.0 · Multi-Asset'}
      </div>
    </aside>
  );
}