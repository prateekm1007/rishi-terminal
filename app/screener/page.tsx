'use client';

import { useState, useMemo } from 'react';
import { STOCKS } from '../../data/stocks';
import { StockTable } from '../../components/screener/StockTable';
import { useLanguage } from '../../lib/language';
import { SCREENER_PRESETS, applyFilters, type ScreenerPreset } from '../../lib/screener/presets';

export default function ScreenerPage() {
  const { t, locale } = useLanguage();
  const stockList = Object.values(STOCKS);
  const [activePreset, setActivePreset] = useState<string | null>(null);

  const filteredStocks = useMemo(() => {
    if (!activePreset) return stockList;
    const preset = SCREENER_PRESETS.find(p => p.id === activePreset);
    if (!preset) return stockList;
    return applyFilters(stockList, preset.filters);
  }, [stockList, activePreset]);

  const STAT_PILLS = useMemo(() => [
    { label: t('screener.strongBuy'),  count: stockList.filter(s => s.pe > 0 && s.roe > 15).length, color: 'var(--accent-green)', bg: 'rgba(16,185,129,0.08)',  border: 'rgba(16,185,129,0.2)'  },
    { label: t('screener.valuePlays'), count: stockList.filter(s => s.pe < 20 && s.pe > 0).length,  color: 'var(--accent-gold)',  bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.2)'  },
    { label: t('screener.largeCap'),   count: stockList.filter(s => s.mktcap > 100000).length,       color: '#c084fc',             bg: 'rgba(192,132,252,0.08)', border: 'rgba(192,132,252,0.2)' },
    { label: t('screener.highROE'),    count: stockList.filter(s => s.roe > 25).length,              color: 'var(--accent-green)', bg: 'rgba(16,185,129,0.08)',  border: 'rgba(16,185,129,0.2)'  },
    { label: t('screener.debtFree'),   count: stockList.filter(s => s.de < 0.3).length,             color: '#f472b6',             bg: 'rgba(244,114,182,0.08)', border: 'rgba(244,114,182,0.2)' },
  ], [t, locale, stockList]);

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>

      <div style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-primary)', padding: '40px 24px' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>

          {/* Breadcrumb */}
          <p style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-muted)', marginBottom: 16, letterSpacing: 2 }}>
            <a href="/" style={{ color: 'var(--accent-gold)', textDecoration: 'none' }}>{t('header.title')}</a>
            <span style={{ margin: '0 8px' }}>›</span>
            <span>{t('screener.title').toUpperCase()}</span>
          </p>

          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 24, marginBottom: 32 }}>
            <div>
              <h1 style={{ fontFamily: 'Cinzel, serif', fontSize: 42, color: 'var(--text-primary)', letterSpacing: 2, marginBottom: 8, lineHeight: 1.1 }}>
                {t('screener.title')}
              </h1>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 480, lineHeight: 1.6 }}>
                {activePreset 
                  ? SCREENER_PRESETS.find(p => p.id === activePreset)?.description 
                  : "Filter stocks by Rishi wisdom — Buffett Mode, Damani Mode, Short Mode, and more"}
              </p>
            </div>

            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: 12, padding: '16px 24px', minWidth: 160 }}>
              <div style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--text-muted)', letterSpacing: 2, marginBottom: 8 }}>
                {activePreset ? "FILTERED" : t('screener.totalCoverage')}
              </div>
              <div style={{ fontSize: 48, fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent-gold)', lineHeight: 1 }}>
                {filteredStocks.length}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                {activePreset ? "stocks matching" : t('screener.nseBseStocks')}
              </div>
            </div>
          </div>

          {/* Rishi Mode Presets */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', letterSpacing: '0.1em', marginBottom: 12 }}>
              🧘 RISHI SCREENING MODES
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                onClick={() => setActivePreset(null)}
                style={{
                  padding: '10px 16px', borderRadius: 10,
                  background: !activePreset ? 'linear-gradient(135deg,rgba(212,175,55,0.15),rgba(212,175,55,0.05))' : 'rgba(31,41,59,0.6)',
                  border: !activePreset ? '1px solid rgba(212,175,55,0.4)' : '1px solid rgba(51,65,85,0.4)',
                  color: !activePreset ? '#D4AF37' : '#64748B',
                  fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                🔍 All Stocks
              </button>
              {SCREENER_PRESETS.map(preset => (
                <button
                  key={preset.id}
                  onClick={() => setActivePreset(preset.id)}
                  style={{
                    padding: '10px 16px', borderRadius: 10,
                    background: activePreset === preset.id ? 'linear-gradient(135deg,rgba(212,175,55,0.15),rgba(212,175,55,0.05))' : 'rgba(31,41,59,0.6)',
                    border: activePreset === preset.id ? '1px solid rgba(212,175,55,0.4)' : '1px solid rgba(51,65,85,0.4)',
                    color: activePreset === preset.id ? '#D4AF37' : '#64748B',
                    fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}
                >
                  <span>{preset.emoji}</span>
                  <span>{preset.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Stat Pills */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
            {STAT_PILLS.map(stat => (
              <div key={stat.label} style={{ background: stat.bg, border: '1px solid ' + stat.border, borderRadius: 10, padding: '12px 16px' }}>
                <div style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--text-muted)', marginBottom: 4, letterSpacing: 1 }}>
                  {stat.label.toUpperCase()}
                </div>
                <div style={{ fontSize: 28, fontFamily: 'monospace', fontWeight: 700, color: stat.color }}>
                  {stat.count}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '32px 24px' }}>
        <StockTable stocks={filteredStocks} />
      </div>

    </main>
  );
}