'use client';

import type { Bond } from '../../data/bonds';

function scoreColor(v: number) {
  return v >= 75 ? '#22C55E' : v >= 55 ? '#D4AF37' : '#EF4444';
}

export function BondDetailClient({ bond }: { bond: Bond }) {
  const durationScore =
    bond.duration < 3 ? 85 :
    bond.duration < 7 ? 70 :
    bond.duration < 12 ? 55 : 40;

  const creditScore =
    bond.rating === 'AAA' ? 90 :
    bond.rating === 'AA+' ? 80 :
    bond.rating === 'AA' ? 70 : 50;

  const spreadScore =
    bond.spread < 25 ? 90 :
    bond.spread < 75 ? 70 :
    bond.spread < 150 ? 55 : 40;

  const convexity = Number((bond.duration * bond.duration * 0.12).toFixed(2));
  const dv01 = Number((bond.duration * bond.price * 0.0001).toFixed(4));

  const overall = Math.round(
    (durationScore + creditScore + spreadScore) / 3
  );

  return (
    <main style={{ maxWidth: 1400, margin: '0 auto', padding: 24 }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>
          BONDS
        </div>

        <h1 style={{ fontSize: 32, marginBottom: 8 }}>
          {bond.name}
        </h1>

        <div style={{ color: '#999' }}>
          {bond.issuer} • {bond.type} • {bond.country}
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))',
        gap: 16,
        marginBottom: 24
      }}>
        {[
          ['YTM', `${bond.ytm}%`],
          ['Duration', `${bond.duration}y`],
          ['Spread', `${bond.spread} bps`],
          ['Coupon', `${bond.couponRate}%`],
          ['Rating', bond.rating],
          ['Maturity', bond.maturityDate]
        ].map(([label,value]) => (
          <div key={label} style={{
            border:'1px solid rgba(255,255,255,0.1)',
            borderRadius:12,
            padding:16
          }}>
            <div style={{ fontSize:12,color:'#888' }}>{label}</div>
            <div style={{ fontSize:22,fontWeight:700 }}>{value}</div>
          </div>
        ))}
      </div>

      <div style={{
        display:'grid',
        gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',
        gap:16
      }}>
        <div style={{ border:'1px solid rgba(255,255,255,0.1)', borderRadius:12, padding:20 }}>
          <h3>Duration Risk</h3>
          <div style={{ fontSize:28, fontWeight:700, color:scoreColor(durationScore) }}>
            {durationScore}
          </div>
          <div>{bond.duration} year duration</div>
        </div>

        <div style={{ border:'1px solid rgba(255,255,255,0.1)', borderRadius:12, padding:20 }}>
          <h3>Credit Quality</h3>
          <div style={{ fontSize:28, fontWeight:700, color:scoreColor(creditScore) }}>
            {creditScore}
          </div>
          <div>{bond.rating}</div>
        </div>

        <div style={{ border:'1px solid rgba(255,255,255,0.1)', borderRadius:12, padding:20 }}>
          <h3>Spread Analysis</h3>
          <div style={{ fontSize:28, fontWeight:700, color:scoreColor(spreadScore) }}>
            {spreadScore}
          </div>
          <div>{bond.spread} bps</div>
        </div>

        <div style={{ border:'1px solid rgba(255,255,255,0.1)', borderRadius:12, padding:20 }}>
          <h3>Convexity</h3>
          <div style={{ fontSize:28, fontWeight:700 }}>
            {convexity}
          </div>
        </div>

        <div style={{ border:'1px solid rgba(255,255,255,0.1)', borderRadius:12, padding:20 }}>
          <h3>DV01</h3>
          <div style={{ fontSize:28, fontWeight:700 }}>
            {dv01}
          </div>
        </div>

        <div style={{ border:'1px solid rgba(255,255,255,0.1)', borderRadius:12, padding:20 }}>
          <h3>Overall Bond Score</h3>
          <div style={{
            fontSize:32,
            fontWeight:700,
            color:scoreColor(overall)
          }}>
            {overall}
          </div>
        </div>
      </div>
    </main>
  );
}