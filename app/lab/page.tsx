'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

import HoldingsTabView     from '@/components/lab/HoldingsTab';
import WatchlistTabView    from '@/components/lab/WatchlistTab';
import CompareTabView      from '@/components/lab/CompareTab';
import BacktestTabView     from '@/components/lab/BacktestTab';
import OverviewTabView     from '@/components/lab/OverviewTab';
import IntelligenceTabView from '@/components/lab/IntelligenceTab';

type LabTab = 'overview' | 'holdings' | 'watchlist' | 'compare' | 'backtest' | 'intelligence';

const TABS: { id: LabTab; label: string; desc: string; icon: string }[] = [
  { id: 'overview',     label: 'Overview',           desc: 'Portfolio snapshot',     icon: '◉' },
  { id: 'holdings',     label: 'Holdings',           desc: 'Real positions',         icon: '▣' },
  { id: 'watchlist',    label: 'Watchlist & Ideas',  desc: 'Track & promote',        icon: '★' },
  { id: 'compare',      label: 'Compare',            desc: 'Multi-asset analysis',   icon: '⚖' },
  { id: 'backtest',     label: 'Backtest Lab',       desc: 'Strategy simulation',    icon: '↺' },
  { id: 'intelligence', label: 'Rishi Intelligence', desc: 'Portfolio-level wisdom', icon: '◌' },
];

function isValidTab(t: string): t is LabTab {
  return ['overview','holdings','watchlist','compare','backtest','intelligence'].includes(t);
}

export default function PortfolioLabPage() {
  return (
    <Suspense fallback={<div style={{ padding: 48, textAlign: 'center', color: '#D4AF37' }}>Loading Lab...</div>}>
      <LabContent />
    </Suspense>
  );
}

function LabContent() {
  const searchParams = useSearchParams();
  const raw = (searchParams.get('tab') ?? '').toLowerCase();
  const activeTab: LabTab = isValidTab(raw) ? raw : 'overview';

  return (
    <div className="rishi-page">
      <div className="page-header">
        <div className="content-wrapper">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 className="philosophy-heading" style={{ fontSize: 32, color: '#D4AF37', letterSpacing: 2 }}>
                Rishi Portfolio Lab
              </h1>
              <p style={{ fontSize: 13, color: '#64748B', marginTop: 8 }}>One Lab. All Conviction.</p>
            </div>
            <a href="/" style={{ padding: '10px 20px', background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.3)', borderRadius: 6, color: '#D4AF37', fontSize: 12, fontFamily: 'monospace', textDecoration: 'none' }}>
              Back to Dashboard
            </a>
          </div>
        </div>
      </div>

      <div style={{ borderBottom: '1px solid rgba(30,41,59,0.8)', background: 'var(--bg-secondary)', position: 'sticky', top: 0, zIndex: 30 }}>
        <div className="content-wrapper">
          <div style={{ display: 'flex', gap: 0, overflowX: 'auto' }}>
            {TABS.map(tab => (
              <a
                key={tab.id}
                href={'/lab?tab=' + tab.id}
                style={{
                  padding: '16px 24px',
                  fontSize: 13,
                  fontFamily: 'monospace',
                  fontWeight: activeTab === tab.id ? 700 : 400,
                  background: 'transparent',
                  borderBottom: activeTab === tab.id ? '2px solid #D4AF37' : '2px solid transparent',
                  color: activeTab === tab.id ? '#D4AF37' : '#64748B',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                  whiteSpace: 'nowrap',
                  textDecoration: 'none',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 16 }}>{tab.icon}</span>
                  {tab.label}
                </span>
                <span style={{ fontSize: 9, opacity: 0.6 }}>{tab.desc}</span>
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="content-wrapper" style={{ padding: '32px 24px' }}>
        {activeTab === 'overview'     && <OverviewTabView />}
        {activeTab === 'holdings'     && <HoldingsTabView />}
        {activeTab === 'watchlist'    && <WatchlistTabView />}
        {activeTab === 'compare'      && <CompareTabView />}
        {activeTab === 'backtest'     && <BacktestTabView />}
        {activeTab === 'intelligence' && <IntelligenceTabView />}
      </div>
    </div>
  );
}