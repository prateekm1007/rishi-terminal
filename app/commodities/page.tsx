'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { COMMODITIES } from '../../data/markets';
import { scoreJimRogers } from '../../lib/scorers/commodity/jimrogers';
import { scoreRickRule } from '../../lib/scorers/commodity/rickrule';
import { scoreDanielYergin } from '../../lib/scorers/commodity/danielyergin';
import { isPremium } from '../../lib/premium';
import { UpgradePrompt } from '../../components/premium/UpgradePrompt';

const COMMODITY_RISHIS = [
  {
    id: 'jimrogers',
    name: 'Jim Rogers',
    tag: 'JR',
    bio: 'Co-founded Quantum Fund with Soros. Predicted the 2000s commodities supercycle. Author of Hot Commodities. Believes in owning physical assets over paper.',
    quote: 'Buy commodities. Buy them and put them away.',
    scorer: scoreJimRogers,
    target: 'GOLD',
  },
  {
    id: 'rickrule',
    name: 'Rick Rule',
    tag: 'RR',
    bio: 'Legendary resource sector investor. CEO of Sprott. Gold as savings, silver as speculation. Most people are speculating in gold when they should be saving in it.',
    quote: 'Gold is money. Everything else is credit.',
    scorer: scoreRickRule,
    target: 'SILVER',
  },
  {
    id: 'yergin',
    name: 'Daniel Yergin',
    tag: 'DY',
    bio: 'Pulitzer Prize-winning energy historian. Author of The Prize. VP at S&P Global. Energy transition and geopolitical oil expert.',
    quote: 'Oil is the lifeblood of the industrial civilization.',
    scorer: scoreDanielYergin,
    target: 'WTI',
  },
];

function scoreColor(score: number): string {
  if (score >= 75) return 'var(--accent-green)';
  if (score >= 55) return 'var(--accent-gold)';
  return 'var(--accent-red)';
}

export default function CommoditiesPage() {
  const router = useRouter();
  const [category, setCategory] = useState('All');
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const premium = isPremium();

  const categories = ['All', ...Array.from(new Set(COMMODITIES.map(c => c.category)))];
  const filtered = category === 'All' ? COMMODITIES : COMMODITIES.filter(c => c.category === category);

  return (
    <main className="page-container">

      {/* Header */}
      <div className="page-header">
        <div className="content-wrapper">
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 16, letterSpacing: 2, fontFamily: 'monospace' }}>
            <Link href="/" style={{ color: 'var(--accent-gold)', textDecoration: 'none' }}>RISHI TERMINAL</Link>
            {' > COMMODITIES'}
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 24 }}>
            <div>
              <h1 className="philosophy-heading" style={{ fontSize: 32, color: 'var(--accent-gold)' }}>
                Commodity Markets
              </h1>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 600, lineHeight: 1.6 }}>
                Jim Rogers, Rick Rule, Daniel Yergin — supercycles, precious metals, and energy geopolitics.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="content-wrapper" style={{ padding: '28px 24px' }}>

        {/* Quick Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 28 }}>
          {[
            { label: 'Gold Spot',   value: '$2,650/oz',                 color: 'var(--accent-gold)' },
            { label: 'Silver Spot', value: '$32.5/oz',                  color: '#94A3B8' },
            { label: 'Crude WTI',   value: '$72.5/bbl',                 color: 'var(--accent-blue)' },
            { label: 'Tracked',     value: COMMODITIES.length + ' assets', color: 'var(--accent-green)' },
          ].map(stat => (
            <div key={stat.label} className="card-sacred" style={{ padding: 16 }}>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 8, letterSpacing: 1 }}>{stat.label.toUpperCase()}</div>
              <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'monospace', color: stat.color }}>{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Rishi Cards */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 3, marginBottom: 16, fontFamily: 'monospace' }}>
            COMMODITY PHILOSOPHERS
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
          {COMMODITY_RISHIS.map(guru => {
            const commodity = COMMODITIES.find(c => c.symbol === guru.target);
            if (!commodity) return null;
            const result = guru.scorer(commodity);
            const isExpanded = expandedCard === guru.id;

            return (
              <div
                key={guru.id}
                className="card-sacred"
                style={{ padding: 0, overflow: 'hidden', cursor: 'pointer' }}
                onClick={() => setExpandedCard(isExpanded ? null : guru.id)}
              >
                <div style={{ height: 2, background: 'linear-gradient(90deg, var(--accent-gold), var(--accent-green))' }} />

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', flexWrap: 'wrap', gap: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{
                      width: 48, height: 48, borderRadius: '50%',
                      background: 'rgba(255,215,0,0.1)',
                      border: '1px solid rgba(255,215,0,0.3)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 700, fontFamily: 'monospace',
                      color: 'var(--accent-gold)',
                    }}>
                      {guru.tag}
                    </div>
                    <div>
                      <div className="philosophy-heading" style={{ fontSize: 18, color: 'var(--text-primary)', marginBottom: 4 }}>
                        {guru.name}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                        {result.label} — {result.origin} — analyzing {commodity.name}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 48, fontWeight: 900, fontFamily: 'monospace', color: scoreColor(result.score), lineHeight: 1 }}>
                        {result.score}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>/100</div>
                    </div>
                    <div style={{ width: 100, height: 6, background: 'var(--bg-secondary)', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: result.score + '%', background: scoreColor(result.score), borderRadius: 4 }} />
                    </div>
                    <div style={{
                      fontSize: 12, color: 'var(--text-muted)',
                      transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.25s ease',
                    }}>v</div>
                  </div>
                </div>

                {isExpanded && (
                  <div style={{ borderTop: '1px solid var(--border-primary)', padding: 24 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginBottom: 20 }}>
                      <div style={{ background: 'var(--bg-secondary)', borderRadius: 10, padding: 18 }}>
                        <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 2, marginBottom: 10 }}>ABOUT</div>
                        <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{guru.bio}</p>
                      </div>
                      <div style={{ background: 'var(--bg-secondary)', borderRadius: 10, padding: 18, borderLeft: '3px solid var(--accent-gold)' }}>
                        <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 2, marginBottom: 10 }}>SIGNATURE QUOTE</div>
                        <p style={{ fontSize: 14, color: 'var(--accent-gold)', fontStyle: 'italic', lineHeight: 1.7 }}>"{guru.quote}"</p>
                      </div>
                    </div>

                    <div style={{ background: 'var(--bg-secondary)', borderRadius: 10, padding: 18, marginBottom: 20 }}>
                      <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 2, marginBottom: 10 }}>
                        CURRENT ANALYSIS — {commodity.name} at {commodity.price}{commodity.unit}
                      </div>
                      <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{result.insight}</p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                      {result.comps.map((comp: any) => (
                        <div key={comp.label} style={{ background: 'var(--bg-secondary)', borderRadius: 10, padding: 16 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{comp.label}</span>
                            <span style={{ fontSize: 16, fontWeight: 700, fontFamily: 'monospace', color: scoreColor(comp.v) }}>{comp.v}</span>
                          </div>
                          <div style={{ height: 5, background: 'var(--border-primary)', borderRadius: 3, overflow: 'hidden', marginBottom: 6 }}>
                            <div style={{ height: '100%', width: comp.v + '%', background: scoreColor(comp.v), borderRadius: 3 }} />
                          </div>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{comp.detail}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Commodity Table */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 3, fontFamily: 'monospace' }}>
            ALL COMMODITIES — CLICK TO EXPLORE
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {categories.map(cat => (
              <button key={cat} onClick={() => setCategory(cat)} style={{
                padding: '6px 14px', borderRadius: 6, fontSize: 11, cursor: 'pointer',
                fontWeight: category === cat ? 700 : 400,
                border: category === cat ? 'none' : '1px solid var(--border-primary)',
                background: category === cat ? 'var(--accent-gold)' : 'var(--bg-card)',
                color: category === cat ? '#000' : 'var(--text-muted)',
                fontFamily: 'monospace',
              }}>{cat}</button>
            ))}
          </div>
        </div>

        <div className="card-sacred" style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-primary)', background: 'var(--bg-secondary)' }}>
                  {['Commodity', 'Price', 'Change', '52W Low', '52W High', '52W Position'].map((h, i) => (
                    <th key={h} style={{
                      textAlign: i === 0 ? 'left' : 'right',
                      padding: '12px 16px',
                      fontSize: 9,
                      color: 'var(--text-muted)',
                      letterSpacing: 1,
                      fontWeight: 600,
                    }}>{h.toUpperCase()}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => {
                  const range = c.high52w - c.low52w;
                  const position = range > 0 ? ((c.price - c.low52w) / range) * 100 : 50;
                  const posColor = position >= 70 ? 'var(--accent-green)' : position >= 30 ? 'var(--accent-gold)' : 'var(--accent-red)';

                  return (
                    <tr
                      key={c.symbol}
                      style={{ borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer', transition: 'background 0.15s' }}
                      onClick={() => router.push('/commodities/' + c.symbol)}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,215,0,0.03)'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                    >
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{
                            width: 36, height: 36, borderRadius: '50%',
                            background: 'rgba(255,215,0,0.08)',
                            border: '1px solid rgba(255,215,0,0.2)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 10, fontWeight: 700, fontFamily: 'monospace',
                            color: 'var(--accent-gold)', flexShrink: 0,
                          }}>
                            {c.symbol.slice(0, 3)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 13 }}>{c.name}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.symbol} — {c.category}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ textAlign: 'right', padding: '14px 16px', fontWeight: 700, fontFamily: 'monospace', fontSize: 14, color: 'var(--text-primary)' }}>
                        {c.price.toLocaleString('en-US')}<span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.unit}</span>
                      </td>
                      <td style={{ textAlign: 'right', padding: '14px 16px', fontWeight: 700, fontFamily: 'monospace', color: c.changePct >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                        {c.changePct >= 0 ? '+' : ''}{c.changePct.toFixed(2)}%
                      </td>
                      <td style={{ textAlign: 'right', padding: '14px 16px', fontSize: 12, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                        {c.low52w.toLocaleString()}
                      </td>
                      <td style={{ textAlign: 'right', padding: '14px 16px', fontSize: 12, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                        {c.high52w.toLocaleString()}
                      </td>
                      <td style={{ textAlign: 'right', padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                          <div style={{ width: 80, height: 5, background: 'var(--border-primary)', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{
                              height: '100%', width: position + '%', borderRadius: 3,
                              background: posColor,
                            }} />
                          </div>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)', minWidth: 32, textAlign: 'right', fontFamily: 'monospace' }}>
                            {position.toFixed(0)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {showUpgrade && <UpgradePrompt reason="locked_feature" onClose={() => setShowUpgrade(false)} />}
    </main>
  );
}