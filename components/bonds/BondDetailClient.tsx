'use client';

import type { Bond } from '../../data/bonds';
import { usePrice } from '../../hooks/useLivePrices';
import { AssetPriceChart } from '../terminal/AssetPriceChart';
import type { UniversalAsset } from '../../lib/types/asset';

function scoreColor(v: number) {
  return v >= 75 ? '#22C55E' : v >= 55 ? '#D4AF37' : '#EF4444';
}

export function BondDetailClient({ bond }: { bond: Bond }) {
  const { price: livePriceData } = usePrice(bond.symbol);
  const displayPrice = livePriceData?.price && livePriceData.price > 0 ? livePriceData.price : bond.price;
  const displayChange = livePriceData?.changePercent24h !== undefined ? livePriceData.changePercent24h : 0;

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

  
  const durationBucket =
    bond.duration < 3 ? "SHORT DURATION" :
    bond.duration < 10 ? "INTERMEDIATE DURATION" :
    "LONG DURATION";

  const curvePosition =
    bond.maturityYears < 2 ? "FRONT END" :
    bond.maturityYears < 10 ? "BELLY" :
    "LONG END";

  const termPremium =
    Number(Math.max(0, bond.ytm - bond.couponRate).toFixed(2));

  const realYield =
    Number((bond.ytm - 3.5).toFixed(2));

  const rateSensitivity =
    bond.duration < 3 ? "LOW" :
    bond.duration < 8 ? "MEDIUM" :
    "HIGH";

  const curveRegime =
    bond.maturityYears >= 10 && bond.ytm > 7
      ? "STEEPENING"
      : bond.maturityYears >= 10
      ? "NEUTRAL"
      : "FRONT-END DOMINATED";

  const overall = Math.round(
    (durationScore + creditScore + spreadScore) / 3
  );

  const bondRishis = [
    {
      name: 'Bill Gross',
      tag: 'Bond King',
      score: Math.round((durationScore * 0.40) + (spreadScore * 0.35) + (creditScore * 0.25)),
      signal: bond.duration <= 5 ? 'DURATION CONTROLLED' : 'WATCH RATE RISK',
      thesis: bond.duration <= 5 ? 'Shorter duration keeps rate shocks contained.' : 'Long duration needs tighter rate-risk discipline.' ,
    },
    {
      name: 'Jeffrey Gundlach',
      tag: 'DoubleLine',
      score: Math.round((spreadScore * 0.40) + (Math.max(0, 100 - Math.abs(termPremium) * 10) * 0.30) + (durationScore * 0.30)),
      signal: curveRegime === 'STEEPENING' ? 'CURVE COMPENSATION' : 'CURVE IS FLAT',
      thesis: termPremium > 0 ? 'Positive term premium supports selective carry.' : 'Curve compensation is thin; prefer quality and carry.',
    },
    {
      name: 'Mohamed El-Erian',
      tag: 'Macro Strategist',
      score: Math.round((creditScore * 0.45) + (durationScore * 0.25) + (spreadScore * 0.30)),
      signal: creditScore >= 80 ? 'QUALITY DEFENSIVE' : 'RISK SELECTIVE',
      thesis: creditScore >= 80 ? 'High-grade balance sheets fit defensive macro portfolios.' : 'Watch liquidity and spread volatility.',
    },
  ];


  const chartAsset = {
    symbol: bond.symbol,
    name: bond.name,
    assetClass: 'bond',
    category: 'bond',
    price: displayPrice,
    change24h: 0,
    changePercent24h: 0,
    marketCap: 0,
    volume24h: 0,
    country: bond.country,
    sector: bond.type,
  } as unknown as UniversalAsset;

  return (
    <main style={{ maxWidth: 1400, margin: '0 auto', padding: 24 }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ marginBottom: 24 }}>
          <AssetPriceChart asset={chartAsset} />
        </div>
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
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginBottom: 24,
        padding: '16px 20px',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 12
      }}>
        <div>
          <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>LIVE PRICE</div>
          <div style={{ fontSize: 36, fontWeight: 700, fontFamily: 'monospace' }}>
            {displayPrice.toLocaleString('en-US', { maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: 13, fontFamily: 'monospace', marginTop: 4,
            color: displayChange >= 0 ? '#22C55E' : '#EF4444' }}>
            {displayChange >= 0 ? '+' : ''}{displayChange.toFixed(2)}%
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 12, color: '#888' }}>YTM</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{bond.ytm}%</div>
          <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>Duration: {bond.duration}y</div>
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
    
      <div style={{
        display:'grid',
        gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',
        gap:16,
        marginTop:16
      }}>
        <div style={{ border:'1px solid rgba(255,255,255,0.1)', borderRadius:12, padding:20 }}>
          <h3>Yield Curve Position</h3>
          <div style={{ fontSize:24, fontWeight:700 }}>
            {curvePosition}
          </div>
        </div>

        <div style={{ border:'1px solid rgba(255,255,255,0.1)', borderRadius:12, padding:20 }}>
          <h3>Duration Bucket</h3>
          <div style={{ fontSize:24, fontWeight:700 }}>
            {durationBucket}
          </div>
        </div>

        <div style={{ border:'1px solid rgba(255,255,255,0.1)', borderRadius:12, padding:20 }}>
          <h3>Real Yield</h3>
          <div style={{ fontSize:24, fontWeight:700 }}>
            {realYield}%
          </div>
        </div>

        <div style={{ border:'1px solid rgba(255,255,255,0.1)', borderRadius:12, padding:20 }}>
          <h3>Term Premium</h3>
          <div style={{ fontSize:24, fontWeight:700 }}>
            {termPremium}%
          </div>
        </div>

        <div style={{ border:'1px solid rgba(255,255,255,0.1)', borderRadius:12, padding:20 }}>
          <h3>Rate Sensitivity</h3>
          <div style={{ fontSize:24, fontWeight:700 }}>
            {rateSensitivity}
          </div>
        </div>

        <div style={{ border:'1px solid rgba(255,255,255,0.1)', borderRadius:12, padding:20 }}>
          <h3>Curve Regime</h3>
          <div style={{ fontSize:24, fontWeight:700 }}>
            {curveRegime}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 24, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: 20 }}>
        <div style={{ fontSize: 12, color: '#888', marginBottom: 12, letterSpacing: 1 }}>BOND RISHIS</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 16 }}>
          {bondRishis.map(r => (
            <div key={r.name} style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 16, background: 'rgba(255,255,255,0.02)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>{r.name}</div>
                  <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{r.tag}</div>
                </div>
                <div style={{ fontSize: 26, fontWeight: 700, color: scoreColor(r.score) }}>{r.score}</div>
              </div>
              <div style={{ marginTop: 10, fontSize: 11, color: scoreColor(r.score), fontWeight: 700, letterSpacing: 0.6 }}>{r.signal}</div>
              <div style={{ marginTop: 8, fontSize: 12, color: '#cbd5e1', lineHeight: 1.5 }}>{r.thesis}</div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
