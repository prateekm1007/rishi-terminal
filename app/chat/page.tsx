'use client';

import { useState, useMemo } from 'react';
import { STOCKS } from '../../data/stocks';
import RishiChat from '../../components/chat/RishiChat';
import { useLanguage } from '../../lib/language';
import { buildConsensus } from '../../lib/consensus';

export default function ChatPage() {
  const { t } = useLanguage();
  const [selectedSymbol, setSelectedSymbol] = useState('TCS');
  const [searchQuery, setSearchQuery] = useState('');

  const stock = STOCKS[selectedSymbol];
  const stocks = Object.values(STOCKS);

  const consensus = stock ? buildConsensus(stock) : null;

  const filteredStocks = useMemo(() => {
    if (!searchQuery) return stocks.slice(0, 50);
    const q = searchQuery.toLowerCase();
    return stocks.filter(s =>
      s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
    ).slice(0, 30);
  }, [searchQuery]);

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg-primary)', padding: '32px 24px', color: 'var(--text-primary)' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontFamily: 'Cinzel, serif', fontSize: 40, color: 'var(--text-primary)', marginBottom: 8 }}>
            💬 Chat with Rishis
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
            Have philosophical conversations with 7 legendary investors. Get investment advice in their distinct voice.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 24, height: 'calc(100vh - 200px)' }}>

          {/* Stock Selector */}
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border-primary)',
            borderRadius: 16, padding: 20, display: 'flex', flexDirection: 'column', gap: 16,
            overflow: 'hidden',
          }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', letterSpacing: '0.1em', marginBottom: 8 }}>
                SEARCH STOCKS
              </div>
              <input
                type="text"
                placeholder="TCS, RELIANCE, INFY..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 8,
                  background: 'rgba(17,24,39,0.8)', border: '1px solid rgba(51,65,85,0.6)',
                  color: '#F8FAFC', fontSize: 13,
                }}
              />
            </div>

            {/* Stock List */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {filteredStocks.map(s => (
                <button
                  key={s.symbol}
                  onClick={() => setSelectedSymbol(s.symbol)}
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: 8, marginBottom: 6,
                    background: selectedSymbol === s.symbol ? 'rgba(212,175,55,0.1)' : 'rgba(31,41,59,0.5)',
                    border: selectedSymbol === s.symbol ? '1px solid rgba(212,175,55,0.4)' : '1px solid rgba(51,65,85,0.4)',
                    color: selectedSymbol === s.symbol ? '#D4AF37' : '#E2E8F0',
                    textAlign: 'left', fontSize: 12, fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  <div>{s.symbol}</div>
                  <div style={{ fontSize: 10, color: '#64748B', marginTop: 2 }}>{s.name}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Chat Interface */}
          {stock && consensus && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, overflow: 'hidden' }}>
              {/* Stock Info Bar */}
              <div style={{
                background: 'var(--bg-card)', border: '1px solid var(--border-primary)',
                borderRadius: 12, padding: '14px 16px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#D4AF37' }}>{stock.symbol}</div>
                  <div style={{ fontSize: 11, color: '#64748B' }}>{stock.name} • {stock.sector}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: consensus.consensus >= 70 ? '#22C55E' : '#F59E0B' }}>
                    {consensus.consensus}/100
                  </div>
                  <div style={{ fontSize: 10, color: '#64748B' }}>
                    PE {stock.pe?.toFixed(1)}x | ROE {stock.roe?.toFixed(1)}%
                  </div>
                </div>
              </div>

              {/* Chat Component */}
              <RishiChat stock={stock} scores={consensus.scores} userTier="disciple" />
            </div>
          )}

        </div>

      </div>
    </main>
  );
}