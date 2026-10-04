'use client';

// N1 (round 3): the interactive lab shell (moved from app/lab/page.tsx).
// Receives the server-generated slim index and distributes it to the
// tabs — no client module imports the seed dataset or the engine.
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import type { SlimStockRow } from '@/lib/scoring/slimIndex';
import ErrorBoundary from './ErrorBoundary';

import HoldingsTabView from './HoldingsTab';
import WatchlistTabView from './WatchlistTab';
import CompareTabView from './CompareTab';
import OverviewTabView from './OverviewTab';
import IntelligenceTabView from './IntelligenceTab';
import SeedDataBanner from '@/components/shared/SeedDataBanner'; // N3: seed-derived analytics in every tab

type LabTab = 'overview' | 'holdings' | 'watchlist' | 'compare' | 'intelligence';
const TABS: { id: LabTab; label: string; desc: string; icon: string }[] = [
  { id: 'overview',     label: 'Overview',          desc: 'Portfolio snapshot',     icon: '◉' },
  { id: 'holdings',     label: 'Holdings',          desc: 'Real positions',         icon: '▣' },
  { id: 'watchlist',    label: 'Watchlist & Ideas', desc: 'Track & promote',        icon: '★' },
  { id: 'compare',      label: 'Compare',           desc: 'Multi-asset analysis',   icon: '⚖️' },
  { id: 'intelligence', label: 'Rishi Intelligence',desc: 'Portfolio-level wisdom', icon: '◌' },
];

function isValidTab(t: string | null): t is LabTab {
  return t === 'overview' || t === 'holdings' || t === 'watchlist' || t === 'compare' || t === 'intelligence';
}

interface Props {
  rows: SlimStockRow[];
}

export function LabContent({ rows }: Props) {
  const searchParams = useSearchParams();
  const rawTab = (searchParams.get('tab') ?? '').toLowerCase();
  const activeTab: LabTab = isValidTab(rawTab) ? rawTab : 'overview';

  return (
    <div className="page-bg">
      {/* Header */}
      <div className="page-header">
        <div className="content-wrapper">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h1 className="philosophy-heading" style={{ fontSize: 32, color: '#D4AF37', letterSpacing: 2 }}>
                Rishi Portfolio Lab
              </h1>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8, letterSpacing: 0.5 }}>
                One Lab. All Conviction.
              </p>
            </div>
            <Link
              href="/"
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
                textDecoration: 'none',
              }}
            >
              Back to Dashboard
            </Link>
          </div>

        </div>
      </div>

      {/* Tab Bar */}
      <div
        style={{
          borderBottom: '1px solid rgba(30,41,59,0.8)',
          background: 'var(--bg-secondary)',
          position: 'sticky',
          top: 0,
          zIndex: 30,
        }}
      >
        <div className="content-wrapper">
          <div style={{ display: 'flex', gap: 0, overflowX: 'auto' }}>
            {TABS.map(tab => {
              const active = activeTab === tab.id;
              return (
                <a
                  key={tab.id}
                  href={'/lab?tab=' + tab.id}
                  style={{
                    padding: '16px 24px',
                    fontSize: 13,
                    fontFamily: 'monospace',
                    fontWeight: active ? 700 : 400,
                    background: 'transparent',
                    borderBottom: active ? '2px solid #D4AF37' : '2px solid transparent',
                    color: active ? '#D4AF37' : 'var(--text-muted)',
                    cursor: 'pointer',
                    letterSpacing: active ? '1px' : '0.5px',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: 4,
                    whiteSpace: 'nowrap',
                    textDecoration: 'none',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 16 }}>{tab.icon}</span>
                    {tab.label}
                  </span>
                  <span style={{ fontSize: 9, letterSpacing: 0.5, opacity: 0.6, fontWeight: 400 }}>
                    {tab.desc}
                  </span>
                </a>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="content-wrapper" style={{ padding: '32px 24px' }}>
        {/* N3 (round 3): consensus scores, council analytics and portfolio
            aggregates in every tab are seed-derived while the dataset is
            a placeholder. */}
        <SeedDataBanner suffix="scores and analytics in the Lab are illustrative placeholders" />
        {activeTab === 'overview'     && <ErrorBoundary name="OverviewTab"><OverviewTabView rows={rows} /></ErrorBoundary>}
        {activeTab === 'holdings'     && <ErrorBoundary name="HoldingsTab"><HoldingsTabView rows={rows} /></ErrorBoundary>}
        {activeTab === 'watchlist'    && <ErrorBoundary name="WatchlistTab"><WatchlistTabView rows={rows} /></ErrorBoundary>}
        {activeTab === 'compare'      && <ErrorBoundary name="CompareTab"><CompareTabView rows={rows} /></ErrorBoundary>}
        {activeTab === 'intelligence' && <ErrorBoundary name="IntelligenceTab"><IntelligenceTabView rows={rows} /></ErrorBoundary>}
      </div>
    </div>
  );
}
