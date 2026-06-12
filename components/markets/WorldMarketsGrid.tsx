'use client';

import { useLivePrices } from '../../hooks/useLivePrices';
import { useState, useMemo } from 'react';

const WORLD_MARKETS = [
  { label: 'S&P 500',    sym: 'SPX',     region: 'US',     desc: 'US Large Cap' },
  { label: 'Dow Jones',  sym: 'DJI',     region: 'US',     desc: 'US Blue Chip' },
  { label: 'Nasdaq',     sym: 'IXIC',    region: 'US',     desc: 'US Tech' },
  { label: 'DAX',        sym: 'DAX',     region: 'Europe', desc: 'Germany' },
  { label: 'FTSE 100',   sym: 'FTSE',    region: 'Europe', desc: 'UK' },
  { label: 'Hang Seng',  sym: 'HSI',     region: 'Asia',   desc: 'Hong Kong' },
  { label: 'Nifty 50',   sym: 'NIFTY50', region: 'India',  desc: 'India Large Cap' },
  { label: 'Sensex',     sym: 'SENSEX',  region: 'India',  desc: 'India Blue Chip' },
];

const REGIONS = ['US', 'Europe', 'Asia', 'India'];

export function WorldMarketsGrid() {
  const symbols = useMemo(() => WORLD_MARKETS.map(m => m.sym), []);
  const { prices, loading } = useLivePrices(symbols);
  const [selectedRegion, setSelectedRegion] = useState<string>('All');

  const filtered = selectedRegion === 'All' 
    ? WORLD_MARKETS 
    : WORLD_MARKETS.filter(m => m.region === selectedRegion);

  // Calculate regime indicators
  const regimes = useMemo(() => {
    const data: Record<string, any> = {};
    WORLD_MARKETS.forEach(m => {
      const price = prices[m.sym];
      const change = price?.changePercent24h ?? 0;
      
      let regime = 'Neutral';
      let flow = 'Sideways';
      
      if (change > 1.5) { regime = 'Risk-On'; flow = 'Inflow'; }
      else if (change < -1.5) { regime = 'Risk-Off'; flow = 'Outflow'; }
      else if (change > 0.5) { regime = 'Cautious'; flow = 'Moderate In'; }
      else if (change < -0.5) { regime = 'Defensive'; flow = 'Moderate Out'; }
      
      data[m.sym] = { regime, flow, volatility: Math.abs(change) };
    });
    return data;
  }, [prices]);

  // Cross-market correlation (simplified heuristic)
  const correlation = useMemo(() => {
    const us = [(prices['SPX']?.changePercent24h ?? 0), (prices['DJI']?.changePercent24h ?? 0), (prices['IXIC']?.changePercent24h ?? 0)];
    const india = [(prices['NIFTY50']?.changePercent24h ?? 0), (prices['SENSEX']?.changePercent24h ?? 0)];
    
    const usAvg = us.reduce((a,b) => a+b, 0) / us.length;
    const indiaAvg = india.reduce((a,b) => a+b, 0) / india.length;
    
    const corr = usAvg * indiaAvg > 0 ? (Math.abs(usAvg - indiaAvg) < 1 ? 'High' : 'Moderate') : 'Low';
    
    return {
      'US ↔ India': corr,
      'US Trend': usAvg > 0 ? 'Positive' : 'Negative',
      'India Trend': indiaAvg > 0 ? 'Positive' : 'Negative',
    };
  }, [prices]);

  return (
    <div>
      {/* Region Filter */}
      <div style={{
        display: 'flex',
        gap: 12,
        marginBottom: 24,
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
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: 16,
        marginBottom: 32
      }}>
        {filtered.map(market => {
          const data = prices[market.sym];
          const change = data?.changePercent24h ?? 0;
          const isUp = change >= 0;
          const regime = regimes[market.sym];

          return (
            <div
              key={market.sym}
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8,
                padding: 20,
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
              <div style={{
                fontSize: 9,
                color: 'var(--text-muted)',
                letterSpacing: 1.5,
                textTransform: 'uppercase',
                marginBottom: 8
              }}>
                {market.region}
              </div>

              <div style={{
                fontSize: 16,
                fontWeight: 700,
                marginBottom: 4
              }}>
                {market.label}
              </div>

              <div style={{
                fontSize: 10,
                color: 'var(--text-muted)',
                marginBottom: 12
              }}>
                {market.desc}
              </div>

              {loading ? (
                <div style={{ 
                  height: 50,
                  display: 'flex',
                  alignItems: 'center',
                  color: 'var(--text-muted)',
                  fontSize: 11
                }}>
                  Loading...
                </div>
              ) : data ? (
                <>
                  <div style={{
                    fontSize: 24,
                    fontWeight: 700,
                    fontFamily: 'var(--font-mono)',
                    marginBottom: 6
                  }}>
                    {data.price?.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 12
                  }}>
                    <div style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: isUp ? 'var(--success)' : 'var(--danger)'
                    }}>
                      {isUp ? '▲' : '▼'} {Math.abs(change).toFixed(2)}%
                    </div>
                    <div style={{
                      fontSize: 10,
                      color: 'var(--text-muted)'
                    }}>
                      24h
                    </div>
                  </div>

                  {/* Regime & Flow */}
                  <div style={{
                    display: 'flex',
                    gap: 6,
                    flexWrap: 'wrap'
                  }}>
                    <div style={{
                      padding: '4px 8px',
                      background: 'rgba(212,175,55,0.1)',
                      border: '1px solid rgba(212,175,55,0.3)',
                      borderRadius: 4,
                      fontSize: 9,
                      color: 'var(--gold)',
                      fontWeight: 600
                    }}>
                      {regime?.regime}
                    </div>
                    <div style={{
                      padding: '4px 8px',
                      background: regime?.flow.includes('In') ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                      border: regime?.flow.includes('In') ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(239,68,68,0.3)',
                      borderRadius: 4,
                      fontSize: 9,
                      color: regime?.flow.includes('In') ? 'var(--success)' : 'var(--danger)',
                      fontWeight: 600
                    }}>
                      {regime?.flow}
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ 
                  color: 'var(--text-muted)',
                  fontSize: 11 
                }}>
                  No data
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Intelligence Panels */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: 20,
        marginTop: 32
      }}>
        {/* Correlation Matrix */}
        <div style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 8,
          padding: 20
        }}>
          <div style={{
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--gold)',
            letterSpacing: 1,
            marginBottom: 16,
            textTransform: 'uppercase'
          }}>
            📊 Cross-Market Correlation
          </div>
          {Object.entries(correlation).map(([key, val]) => (
            <div key={key} style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '8px 0',
              borderBottom: '1px solid rgba(255,255,255,0.05)',
              fontSize: 12
            }}>
              <span style={{ color: 'var(--text-muted)' }}>{key}</span>
              <span style={{ 
                fontWeight: 600,
                color: val === 'High' || val === 'Positive' ? 'var(--success)' : 
                       val === 'Low' || val === 'Negative' ? 'var(--danger)' : 
                       'var(--gold)'
              }}>
                {val}
              </span>
            </div>
          ))}
        </div>

        {/* Regime Detection */}
        <div style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 8,
          padding: 20
        }}>
          <div style={{
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--gold)',
            letterSpacing: 1,
            marginBottom: 16,
            textTransform: 'uppercase'
          }}>
            🧠 Global Regime Map
          </div>
          {REGIONS.map(region => {
            const regionMarkets = WORLD_MARKETS.filter(m => m.region === region);
            const avgChange = regionMarkets.reduce((sum, m) => sum + (prices[m.sym]?.changePercent24h ?? 0), 0) / regionMarkets.length;
            
            let status = 'Neutral';
            if (avgChange > 1) status = 'Risk-On';
            else if (avgChange < -1) status = 'Risk-Off';
            
            return (
              <div key={region} style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '8px 0',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                fontSize: 12
              }}>
                <span style={{ color: 'var(--text-muted)' }}>{region}</span>
                <span style={{ 
                  fontWeight: 600,
                  color: status === 'Risk-On' ? 'var(--success)' : 
                         status === 'Risk-Off' ? 'var(--danger)' : 
                         'var(--text-primary)'
                }}>
                  {status} {avgChange > 0 ? '▲' : avgChange < 0 ? '▼' : '—'} {Math.abs(avgChange).toFixed(2)}%
                </span>
              </div>
            );
          })}
        </div>

        {/* Capital Flow Summary */}
        <div style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 8,
          padding: 20
        }}>
          <div style={{
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--gold)',
            letterSpacing: 1,
            marginBottom: 16,
            textTransform: 'uppercase'
          }}>
            💰 Capital Flow Analysis
          </div>
          {(() => {
            const inflows = WORLD_MARKETS.filter(m => (prices[m.sym]?.changePercent24h ?? 0) > 0.5).length;
            const outflows = WORLD_MARKETS.filter(m => (prices[m.sym]?.changePercent24h ?? 0) < -0.5).length;
            const neutral = WORLD_MARKETS.length - inflows - outflows;
            
            return (
              <>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '8px 0',
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                  fontSize: 12
                }}>
                  <span style={{ color: 'var(--text-muted)' }}>Inflow Markets</span>
                  <span style={{ fontWeight: 600, color: 'var(--success)' }}>{inflows}</span>
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '8px 0',
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                  fontSize: 12
                }}>
                  <span style={{ color: 'var(--text-muted)' }}>Outflow Markets</span>
                  <span style={{ fontWeight: 600, color: 'var(--danger)' }}>{outflows}</span>
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '8px 0',
                  fontSize: 12
                }}>
                  <span style={{ color: 'var(--text-muted)' }}>Neutral</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{neutral}</span>
                </div>
                <div style={{
                  marginTop: 12,
                  padding: 12,
                  background: inflows > outflows ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                  borderRadius: 6,
                  fontSize: 11,
                  color: inflows > outflows ? 'var(--success)' : 'var(--danger)',
                  textAlign: 'center',
                  fontWeight: 600
                }}>
                  {inflows > outflows ? '🟢 Net Global Inflow' : outflows > inflows ? '🔴 Net Global Outflow' : '⚪ Balanced Flow'}
                </div>
              </>
            );
          })()}
        </div>
      </div>
    </div>
  );
}