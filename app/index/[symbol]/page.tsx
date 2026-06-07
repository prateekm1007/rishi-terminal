'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { INDIAN_INDEXES, GLOBAL_INDEXES, getIndexBySymbol } from '../../../data/indexes';

export default function IndexPage() {
  const params = useParams();
  const symbol = params.symbol as string;
  const indexData = getIndexBySymbol(symbol);

  if (!indexData) {
    return (
      <main className="page-bg">
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>404</div>
            <p>Index {symbol} not found</p>
            <Link href="/" style={{ color: 'var(--accent-gold)', textDecoration: 'none', marginTop: 16, display: 'inline-block' }}>
              Back to Dashboard
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const posChange = indexData.change >= 0;
  const allIndexes = [...INDIAN_INDEXES, ...GLOBAL_INDEXES];

  return (
    <main className="page-bg">
      <div className="page-header">
        <div className="content-wrapper" style={{ padding: '0 24px' }}>

          <p style={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: 'var(--text-muted)', marginBottom: 16, letterSpacing: 2 }}>
            <Link href="/" style={{ color: 'var(--accent-gold)', textDecoration: 'none' }}>RISHI TERMINAL</Link>
            <span style={{ margin: '0 8px' }}>{' > '}</span>
            <span>INDEX</span>
            <span style={{ margin: '0 8px' }}>{' > '}</span>
            <span>{indexData.symbol}</span>
          </p>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 24 }}>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', letterSpacing: 1, marginBottom: 8 }}>
                {indexData.flag || 'GLOBAL'}
              </div>
              <h1 style={{ fontFamily: 'Cinzel, serif', fontSize: 42, color: 'var(--text-primary)', letterSpacing: 2, marginBottom: 8, lineHeight: 1.1 }}>
                {indexData.name}
              </h1>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                Market Index
              </p>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 48, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>
                {indexData.value.toLocaleString()}
              </div>
              <div style={{ fontSize: 20, color: posChange ? 'var(--accent-green)' : 'var(--accent-red)', fontWeight: 700, marginTop: 8 }}>
                {posChange ? '+' : ''}{indexData.change} ({posChange ? '+' : ''}{indexData.changePct}%)
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12, marginTop: 32 }}>
            <div className="card" style={{ padding: 12 }}>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 1, marginBottom: 6 }}>52W HIGH</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{indexData.high52w.toLocaleString()}</div>
            </div>
            <div className="card" style={{ padding: 12 }}>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 1, marginBottom: 6 }}>52W LOW</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{indexData.low52w.toLocaleString()}</div>
            </div>
            {indexData.pe && (
              <div className="card" style={{ padding: 12 }}>
                <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 1, marginBottom: 6 }}>PE RATIO</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{indexData.pe}x</div>
              </div>
            )}
            {indexData.pb && (
              <div className="card" style={{ padding: 12 }}>
                <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 1, marginBottom: 6 }}>PB RATIO</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{indexData.pb}x</div>
              </div>
            )}
            {indexData.dividend && (
              <div className="card" style={{ padding: 12 }}>
                <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 1, marginBottom: 6 }}>DIVIDEND YIELD</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent-green)' }}>{indexData.dividend}%</div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="content-wrapper" style={{ padding: '32px 24px' }}>

        <div className="card" style={{ padding: 24, marginBottom: 32 }}>
          <div style={{ fontSize: 10, color: 'var(--accent-gold)', letterSpacing: 2, marginBottom: 20, fontWeight: 700 }}>
            OVERVIEW
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 24 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>Index Symbol</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{indexData.symbol}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>Current Value</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{indexData.value.toLocaleString()}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>52-Week Range</div>
              <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                {indexData.low52w.toLocaleString()} to {indexData.high52w.toLocaleString()}
              </div>
              <div style={{ marginTop: 8, height: 6, background: 'var(--border-primary)', borderRadius: 3, position: 'relative' }}>
                <div style={{
                  position: 'absolute',
                  left: `${((indexData.value - indexData.low52w) / (indexData.high52w - indexData.low52w)) * 100}%`,
                  top: -2,
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: 'var(--accent-gold)',
                  transform: 'translateX(-50%)',
                }} />
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>Today</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: posChange ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                {posChange ? '+' : ''}{indexData.changePct}%
              </div>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: 24 }}>
          <div style={{ fontSize: 10, color: 'var(--accent-gold)', letterSpacing: 2, marginBottom: 20, fontWeight: 700 }}>
            ALL INDEXES — CLICK TO COMPARE
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
            {allIndexes.map(idx => {
              const isActive = idx.symbol === indexData.symbol;
              const idxPos = idx.change >= 0;
              return (
                <Link key={idx.symbol} href={`/index/${idx.symbol}`}
                  style={{
                    padding: '16px',
                    background: isActive ? 'rgba(255,215,0,0.1)' : 'var(--bg-secondary)',
                    border: isActive ? '1px solid var(--accent-gold)' : '1px solid var(--border-primary)',
                    borderRadius: 10,
                    textDecoration: 'none',
                    transition: 'all 0.2s ease',
                    display: 'block',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent-gold)';
                    (e.currentTarget as HTMLElement).style.background = 'rgba(255,215,0,0.05)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = isActive ? 'var(--accent-gold)' : 'var(--border-primary)';
                    (e.currentTarget as HTMLElement).style.background = isActive ? 'rgba(255,215,0,0.1)' : 'var(--bg-secondary)';
                  }}
                >
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: 1, marginBottom: 4 }}>{idx.flag}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: isActive ? 'var(--accent-gold)' : 'var(--text-primary)' }}>{idx.symbol}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>{idx.name}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{idx.value.toLocaleString()}</div>
                  <div style={{ fontSize: 12, color: idxPos ? 'var(--accent-green)' : 'var(--accent-red)', marginTop: 4, fontWeight: 700 }}>
                    {idxPos ? '+' : ''}{idx.changePct}%
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

      </div>
    </main>
  );
}