'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: '🏠' },
  { href: '/screener', label: 'Screener', icon: '🔍' },
  { href: '/portfolio', label: 'Portfolio', icon: '💼' },
  { href: '/compare', label: 'Compare', icon: '⚖️' },
  { href: '/commodities', label: 'Commodities', icon: '🏅' },
  { href: '/crypto', label: 'Crypto', icon: '₿' },
  { href: '/rishis', label: 'All Rishis', icon: '🧘' },
  { href: '/watchlist', label: 'Watchlist', icon: '👁️' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  return (
    <aside style={{ width: collapsed ? 60 : 200, background: '#06060D', borderRight: '1px solid #1E293B', display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh' }}>
      <div style={{ padding: 12, borderBottom: '1px solid #1E293B' }}>
        {!collapsed && <span style={{ fontSize: 14, color: '#F59E0B' }}>RISHI</span>}
        <button onClick={() => setCollapsed(!collapsed)} style={{ background: 'transparent', border: 'none', color: '#64748B', cursor: 'pointer' }}>{collapsed ? '→' : '←'}</button>
      </div>
      <nav style={{ flex: 1, padding: 12 }}>
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link key={item.href} href={item.href} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 6, marginBottom: 6, background: active ? '#F59E0B15' : 'transparent', border: active ? '1px solid #F59E0B40' : '1px solid transparent', color: active ? '#F59E0B' : '#94A3B8', textDecoration: 'none', fontSize: 13 }}>
              <span>{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}