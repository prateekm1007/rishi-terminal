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

interface WorldMarketsGridProps {
  activeLens?: 'None' | 'All' | 'Hayek' | 'Friedman' | 'Keynes';
}

export function WorldMarketsGrid({ activeLens = 'None' }: WorldMarketsGridProps) {
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

  // Cross-market correlation
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

  // Philosopher interpretations
  const philosopherInsights = useMemo(() => {
    const us = [(prices['SPX']?.changePercent24h ?? 0), (prices['DJI']?.changePercent24h ?? 0), (prices['IXIC']?.changePercent24h ?? 0)];
    const usAvg = us.reduce((a,b) => a+b, 0) / us.length;
    
    const indiaAvg = ((prices['NIFTY50']?.changePercent24h ?? 0) + (prices['SENSEX']?.changePercent24h ?? 0)) / 2;
    
    const spxChange = prices['SPX']?.changePercent24h ?? 0;
    const nasdaqChange = prices['IXIC']?.changePercent24h ?? 0;

    const globalRiskOn = usAvg > 0.5;
    const globalRiskOff = usAvg < -0.5;

    return {
      Hayek: {
        title: 'Austrian Perspective: Market Signals & Distortions',
        color: '#818CF8',
        interpretation: globalRiskOn
          ? `Markets rising ${usAvg.toFixed(2)}% globally — but is this organic price discovery or central bank liquidity distortion? Watch credit spreads and real yields. If risk assets rally while bonds are bid, suspect intervention. True capital allocation requires market clearing, not perpetual stimulus. India's strength (${indiaAvg > 0 ? '+' : ''}${indiaAvg.toFixed(2)}%) may reflect structural reallocation — but government capex cannot replace private entrepreneurial discovery indefinitely.`
          : globalRiskOff
          ? `Global markets down ${usAvg.toFixed(2)}% — malinvestments being revealed. This is necessary creative destruction. Central banks' instinct will be to 'rescue' markets with rate cuts — a mistake. Let prices clear. Over-leveraged structures must unwind. India's ${indiaAvg < 0 ? 'decline' : 'resilience'} (${indiaAvg > 0 ? '+' : ''}${indiaAvg.toFixed(2)}%) ${indiaAvg < 0 ? 'reflects contagion from global credit cycle' : 'shows domestic demand foundation — but fiscal sustainability matters'}.`
          : `Markets in equilibrium (US ${usAvg > 0 ? '+' : ''}${usAvg.toFixed(2)}%). Volatility suppressed by central bank put options — this is false stability. Entrepreneur cannot plan in regime of perpetual intervention. India ${indiaAvg > 0 ? 'outperforming' : 'tracking global'} (${indiaAvg > 0 ? '+' : ''}${indiaAvg.toFixed(2)}%) — domestic savings pool and capex may provide buffer, but watch for credit quality deterioration in late-cycle.`,
        actionable: [
          globalRiskOn ? 'Quality over momentum — rising tide lifts all boats, but tide will turn' : 'Avoid averaging down in zombie companies — let liquidation work',
          'Prefer unleveraged, cash-generative businesses',
          globalRiskOff ? 'This is not a dip to buy — this is price discovery' : 'Be skeptical of narratives that ignore business fundamentals',
          indiaAvg > 1 ? 'India strength is real but government-led — watch private capex for confirmation' : 'India cannot decouple indefinitely from global liquidity cycle',
        ],
      },
      Friedman: {
        title: 'Monetarist Lens: Money Supply, Velocity & Lag Effects',
        color: '#34D399',
        interpretation: globalRiskOn
          ? `US markets up ${usAvg.toFixed(2)}% — consistent with 12-18 month lag from 2023 liquidity injection. Nasdaq (+${nasdaqChange.toFixed(2)}%) leading suggests risk appetite rising. But: watch M2 growth. If rally driven by valuation expansion (multiple re-rating) rather than earnings, it's speculative. India's move (${indiaAvg > 0 ? '+' : ''}${indiaAvg.toFixed(2)}%) may reflect domestic M3 growth at 11%+ — monetary conditions still accommodative despite RBI pause. Inflation risk in 6-9 months if money velocity picks up.`
          : globalRiskOff
          ? `Global selloff (${usAvg.toFixed(2)}%) likely driven by monetary tightening lags catching up. Fed's 2022-23 hikes still transmitting through credit channels. Nasdaq weakness (${nasdaqChange.toFixed(2)}%) confirms long-duration asset repricing. India ${indiaAvg < 0 ? 'not immune' : 'holding up'} (${indiaAvg > 0 ? '+' : ''}${indiaAvg.toFixed(2)}%) — but RBI's policy lag also applies. If US enters recession, India will face headwinds via trade and FII flows, regardless of domestic M3.`
          : `Markets flat (US ${usAvg > 0 ? '+' : ''}${usAvg.toFixed(2)}%) — classic mid-cycle pause. Monetary policy working as intended: inflation cooling without hard landing (yet). India (${indiaAvg > 0 ? '+' : ''}${indiaAvg.toFixed(2)}%) tracking fundamentals. Key question: will central banks cut prematurely? If they do, expect asset inflation to return. If they hold, expect further credit normalization. I favor rules-based approach: let nominal GDP guide policy, not equity volatility.`,
        actionable: [
          'Track M2/M3 growth rates — leading indicator for 12-month forward returns',
          globalRiskOn ? 'Rally sustainable only if backed by earnings growth, not just multiple expansion' : 'Sell rallies if driven by rate-cut hopes alone',
          'In India: favor pricing-power businesses if M3 stays above 10%',
          globalRiskOff ? 'Build positions in quality if PE ratios compress below historical avg' : 'Avoid chasing momentum without fundamental support',
        ],
      },
      Keynes: {
        title: 'Keynesian View: Aggregate Demand, Confidence & Policy Response',
        color: '#FB923C',
        interpretation: globalRiskOn
          ? `Markets rising ${usAvg.toFixed(2)}% — animal spirits awakening. This is exactly what expansionary policy aims for: wealth effect → consumption → capex → self-reinforcing growth. Nasdaq strength (${nasdaqChange.toFixed(2)}%) signals confidence in future innovation and productivity. India's rally (${indiaAvg > 0 ? '+' : ''}${indiaAvg.toFixed(2)}%) reflects domestic demand stimulus working. Now is NOT the time to withdraw support. Central banks should cut rates pre-emptively to sustain momentum. Fiscal austerity would be self-defeating.`
          : globalRiskOff
          ? `Markets falling ${usAvg.toFixed(2)}% — confidence collapsing. This is the paradox of thrift and liquidity preference in action. If everyone hoards cash simultaneously, aggregate demand craters. Central banks MUST act: cut rates 50bps+ immediately, restart QE if needed. Fiscal policy should step in with targeted spending. India's ${indiaAvg < 0 ? 'decline' : 'resilience'} (${indiaAvg > 0 ? '+' : ''}${indiaAvg.toFixed(2)}%) shows ${indiaAvg < 0 ? 'we are all in same boat — global coordination needed' : 'domestic demand can cushion external shocks IF policy supports it'}.`
          : `Markets neutral (US ${usAvg > 0 ? '+' : ''}${usAvg.toFixed(2)}%) — equilibrium at sub-optimal employment level. This is liquidity trap territory. Central banks should ease now, before recession forces their hand. India (${indiaAvg > 0 ? '+' : ''}${indiaAvg.toFixed(2)}%) has fiscal space and RBI has room to cut. Waiting for inflation to fall further risks demand destruction. Pre-emptive policy > reactive crisis management. Government spending is not 'crowding out' — it's crowding IN private investment by sustaining confidence.`,
        actionable: [
          globalRiskOn ? 'Overweight domestic demand proxies — consumption, housing, financials' : 'Rate cuts coming — position in high-quality growth and duration',
          'Infrastructure, renewable energy, and public capex beneficiaries remain core',
          globalRiskOff ? 'Do not panic sell — policy response will stabilize markets' : 'Cyclicals over defensives if policy remains accommodative',
          indiaAvg > 0 ? 'India is proving domestic multiplier works — stay invested' : 'India needs coordinated rate cut + fiscal push to sustain momentum',
        ],
      },
    };
  }, [prices]);

  const inflows = WORLD_MARKETS.filter(m => (prices[m.sym]?.changePercent24h ?? 0) > 0.5).length;
  const outflows = WORLD_MARKETS.filter(m => (prices[m.sym]?.changePercent24h ?? 0) < -0.5).length;
  const neutral = WORLD_MARKETS.length - inflows - outflows;

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

      {/* Philosopher Interpretations */}
      {activeLens !== 'None' && (
        <div style={{ marginBottom: 32 }}>
          <div style={{
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--gold)',
            letterSpacing: 1.5,
            textTransform: 'uppercase',
            marginBottom: 20
          }}>
            🧠 Philosophical Interpretations
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {(activeLens === 'All'
              ? [philosopherInsights.Hayek, philosopherInsights.Friedman, philosopherInsights.Keynes]
              : [philosopherInsights[activeLens]]
            ).map((insight) => (
              <div
                key={insight.title}
                style={{
                  background: 'rgba(17,24,39,0.85)',
                  border: `1px solid ${insight.color}30`,
                  borderLeft: `3px solid ${insight.color}`,
                  borderRadius: 12,
                  padding: 24
                }}
              >
                <div style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: insight.color,
                  marginBottom: 16,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}>
                  {insight.title}
                </div>

                <div style={{
                  fontSize: 12,
                  color: 'var(--text-secondary)',
                  lineHeight: 1.8,
                  marginBottom: 20
                }}>
                  {insight.interpretation}
                </div>

                <div style={{
                  fontSize: 10,
                  color: 'var(--text-muted)',
                  letterSpacing: 1,
                  textTransform: 'uppercase',
                  marginBottom: 12,
                  fontWeight: 700
                }}>
                  Actionable Implications
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {insight.actionable.map((action, i) => (
                    <div
                      key={i}
                      style={{
                        fontSize: 11,
                        color: 'var(--text-secondary)',
                        paddingLeft: 12,
                        borderLeft: `2px solid ${insight.color}40`,
                        lineHeight: 1.6
                      }}
                    >
                      • {action}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
        </div>
      </div>
    </div>
  );
}