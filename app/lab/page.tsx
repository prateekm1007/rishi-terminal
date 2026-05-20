'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import HoldingsTabView from '@/components/lab/HoldingsTab';
import WatchlistTabView from '@/components/lab/WatchlistTab';
import CompareTabView from '@/components/lab/CompareTab';
import BacktestTabView from '@/components/lab/BacktestTab';
import OverviewTabView from '@/components/lab/OverviewTab';
import IntelligenceTabView from '@/components/lab/IntelligenceTab';

type LabTab = 'overview' | 'holdings' | 'watchlist' | 'compare' | 'backtest' | 'intelligence';

const TABS: { id: LabTab; label: string; desc: string; icon: string }[] = [
  { id: 'overview',     label: 'Overview',          desc: 'Portfolio snapshot',        icon: '◉' },
  { id: 'holdings',     label: 'Holdings',          desc: 'Real positions',            icon: '▣' },
  { id: 'watchlist',    label: 'Watchlist & Ideas', desc: 'Track & promote',           icon: '★' },
  { id: 'compare',      label: 'Compare',           desc: 'Multi-asset analysis',      icon: '⚖' },
  { id: 'backtest',     label: 'Backtest Lab',      desc: 'Strategy simulation',       icon: '↺' },
  { id: 'intelligence', label: 'Rishi Intelligence', desc: 'Portfolio-level wisdom',  icon: '◌' },
];


export default function PortfolioLabPage() {
  return (
    <Suspense fallback={<div className="rishi-page" style={{ padding: 48, textAlign: 'center' }}><p style={{ color: '#D4AF37' }}>Loading Lab...</p></div>}>
      <LabContent />
    </Suspense>
  );
}

function LabContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const isValidTab = (t: string): t is LabTab =>
    t === 'overview' || t === 'holdings' || t === 'watchlist' || t === 'compare' || t === 'backtest' || t === 'intelligence';
  
  const [activeTab, setActiveTab] = useState<LabTab>(() => {
    const t = (searchParams.get('tab') ?? '').toLowerCase();
    return isValidTab(t) ? t : 'overview';
  });
  
  useEffect(() => {
    const t = (searchParams.get('tab') ?? '').toLowerCase();
    if (isValidTab(t) && t !== activeTab) {
      setActiveTab(t);
    }
  }, [searchParams, activeTab]);
  return (
    <div className="rishi-page">
      {/* Header */}
      <div className="page-header">
        <div className="content-wrapper">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 className="philosophy-heading" style={{ fontSize: 32, color: '#D4AF37', letterSpacing: 2 }}>
                Rishi Portfolio Lab
              </h1>
              <p style={{ fontSize: 13, color: '#64748B', marginTop: 8, letterSpacing: 0.5 }}>
                One Lab. All Conviction.
              </p>
            </div>
            <button
              onClick={() => router.push('/')}
              style={{
                padding: '10px 20px',
                background: 'rgba(212,175,55,0.1)',
                border: '1px solid rgba(212,175,55,0.3)',
                borderRadius: 6,
                color: '#D4AF37',
                fontSize: 12,
                fontFamily: 'monospace',
                cursor: 'pointer',
                letterSpacing: 1,
              }}
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>

      {/* Tab Bar */}
      <div style={{
        borderBottom: '1px solid rgba(30,41,59,0.8)',
        background: 'var(--bg-secondary)',
        position: 'sticky',
        top: 0,
        zIndex: 30,
      }}>
        <div className="content-wrapper">
          <div style={{ display: 'flex', gap: 0, overflowX: 'auto' }}>
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); router.replace(`/lab?tab=${tab.id}`); }}
                style={{
                  padding: '16px 24px',
                  fontSize: 13,
                  fontFamily: 'monospace',
                  fontWeight: activeTab === tab.id ? 700 : 400,
                  background: 'transparent',
                  border: 'none',
                  borderBottom: activeTab === tab.id ? '2px solid #D4AF37' : '2px solid transparent',
                  color: activeTab === tab.id ? '#D4AF37' : '#64748B',
                  cursor: 'pointer',
                  letterSpacing: activeTab === tab.id ? '1px' : '0.5px',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: 4,
                  whiteSpace: 'nowrap',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 16 }}>{tab.icon}</span>
                  {tab.label}
                </span>
                <span style={{ fontSize: 9, letterSpacing: 0.5, opacity: 0.6, fontWeight: 400 }}>
                  {tab.desc}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="content-wrapper" style={{ padding: '32px 24px' }}>
        {activeTab === 'overview' && <OverviewTabView />}
        {activeTab === 'holdings' && <HoldingsTabView />}
        {activeTab === 'watchlist' && <WatchlistTabView />}
        {activeTab === 'compare' && <CompareTabView />}
        {activeTab === 'backtest' && <BacktestTabView />}
        {activeTab === 'intelligence' && <IntelligenceTabView />}
      </div>
    </div>
  );
}

