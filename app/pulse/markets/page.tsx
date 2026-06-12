'use client';

import { useEffect, useState } from 'react';
import { useLivePrices } from '../../../hooks/useLivePrices';
import Link from 'next/link';

const WORLD_MARKETS = [
  { label: 'S&P 500',    sym: 'SPX',  region: 'US',     desc: 'US Large Cap' },
  { label: 'Dow Jones',  sym: 'DJI',  region: 'US',     desc: 'US Blue Chip' },
  { label: 'Nasdaq',     sym: 'IXIC', region: 'US',     desc: 'US Tech' },
  { label: 'DAX',        sym: 'DAX',  region: 'Europe', desc: 'Germany' },
  { label: 'FTSE 100',   sym: 'FTSE', region: 'Europe', desc: 'UK' },
  { label: 'Hang Seng',  sym: 'HSI',  region: 'Asia',   desc: 'Hong Kong' },
  { label: 'Nifty 50',   sym: 'NSEI', region: 'India',  desc: 'India Large Cap' },
  { label: 'Sensex',     sym: 'SENSEX', region: 'India', desc: 'India Blue Chip' },
];

const REGIONS = ['US', 'Europe', 'Asia', 'India'];

export default function WorldMarketsPage() {
  const symbols = WORLD_MARKETS.map(m => m.sym);
  const { prices, loading } = useLivePrices(symbols);
  const [selectedRegion, setSelectedRegion] = useState<string>('All');

  const filtered = selectedRegion === 'All' 
    ? WORLD_MARKETS 
    : WORLD_MARKETS.filter(m => m.region === selectedRegion);

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'var(--bg-primary)', 
      color: 'var(--text-primary)',
      padding: '40px 20px'
    }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{ marginBottom: 40 }}>
          <Link href="/pulse" style={{ 
            fontSize: 11, 
            color: 'var(--gold)', 
            textDecoration: 'none',
            letterSpacing: 1
          }}>
            ← ECONOMY PLUS
          </Link>
          
          <h1 style={{ 
            fontSize: 32, 
            fontWeight: 700, 
            marginTop: 16,
            marginBottom: 8 
          }}>
            World Markets Command Center
          </h1>
          
          <p style={{ 
            fontSize: 14, 
            color: 'var(--text-muted)',
            maxWidth: 600
          }}>
            Real-time global market intelligence across regions and asset classes
          </p>
        </div>

        {/* Region Filter */}
        <div style={{ 
          display: 'flex', 
          gap: 12, 
          marginBottom: 32,
          flexWrap: 'wrap'
        }}>
          {['All', ...REGIONS].map(region => (
            <button
              key={region}
              onClick={() => setSelectedRegion(region)}
              style={{
                padding: '8px 16px',
                background: selectedRegion === region 
                  ? 'rgba(212,175,55,0.15)' 
                  : 'rgba(255,255,255,0.05)',
                border: selectedRegion === region
                  ? '1px solid rgba(212,175,55,0.4)'
                  : '1px solid rgba(255,255,255,0.1)',
                borderRadius: 6,
                color: selectedRegion === region ? 'var(--gold)' : 'var(--text-muted)',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                letterSpacing: 0.5,
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => {
                if (selectedRegion !== region) {
                  e.currentTarget.style.borderColor = 'rgba(212,175,55,0.2)';
                }
              }}
              onMouseLeave={e => {
                if (selectedRegion !== region) {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                }
              }}
            >
              {region}
            </button>
          ))}
        </div>

        {/* Markets Grid */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: 20
        }}>
          {filtered.map(market => {
            const data = prices[market.sym];
            const change = data?.changePercent24h ?? 0;
            const isUp = change >= 0;

            return (
              <div
                key={market.sym}
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 8,
                  padding: 24,
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'rgba(212,175,55,0.3)';
                  e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                  e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                }}
              >
                {/* Region Tag */}
                <div style={{
                  fontSize: 9,
                  color: 'var(--text-muted)',
                  letterSpacing: 1.5,
                  textTransform: 'uppercase',
                  marginBottom: 12
                }}>
                  {market.region}
                </div>

                {/* Market Name */}
                <div style={{
                  fontSize: 18,
                  fontWeight: 700,
                  marginBottom: 4
                }}>
                  {market.label}
                </div>

                {/* Description */}
                <div style={{
                  fontSize: 11,
                  color: 'var(--text-muted)',
                  marginBottom: 16
                }}>
                  {market.desc}
                </div>

                {/* Price & Change */}
                {loading ? (
                  <div style={{ 
                    height: 60,
                    display: 'flex',
                    alignItems: 'center',
                    color: 'var(--text-muted)',
                    fontSize: 12
                  }}>
                    Loading...
                  </div>
                ) : data ? (
                  <>
                    <div style={{
                      fontSize: 28,
                      fontWeight: 700,
                      fontFamily: 'var(--font-mono)',
                      marginBottom: 8
                    }}>
                      {data.price?.toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}
                    </div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8
                    }}>
                      <div style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: isUp ? 'var(--success)' : 'var(--danger)'
                      }}>
                        {isUp ? '▲' : '▼'} {Math.abs(change).toFixed(2)}%
                      </div>
                      <div style={{
                        fontSize: 11,
                        color: 'var(--text-muted)'
                      }}>
                        24h
                      </div>
                    </div>
                  </>
                ) : (
                  <div style={{ 
                    color: 'var(--text-muted)',
                    fontSize: 12 
                  }}>
                    No data
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer Note */}
        <div style={{
          marginTop: 40,
          padding: 20,
          background: 'rgba(212,175,55,0.05)',
          border: '1px solid rgba(212,175,55,0.2)',
          borderRadius: 8,
          fontSize: 12,
          color: 'var(--text-muted)',
          lineHeight: 1.6
        }}>
          <strong style={{ color: 'var(--gold)' }}>Coming Soon:</strong> Capital flow analysis, 
          regime detection, correlation matrices, and cross-market intelligence
        </div>

      </div>
    </div>
  );
}