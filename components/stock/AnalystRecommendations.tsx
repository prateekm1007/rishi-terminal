'use client';

import Link from 'next/link';
import { useLanguage } from '../../lib/language';

interface AnalystRec {
  firm: string;
  rating: string;
  targetPrice: number;
  date: string;
  symbol?: string;
}

interface Props {
  recommendations: AnalystRec[];
  currentPrice: number;
}

export function AnalystRecommendations({ recommendations, currentPrice }: Props) {
  const { t } = useLanguage();
  if (!recommendations || recommendations.length === 0 || !currentPrice) return null;

  const safeNum = (v: any) => isNaN(Number(v)) ? 0 : Number(v);

  const avgTarget = recommendations.reduce((s, r) => s + safeNum(r.targetPrice), 0) / recommendations.length;
  const avgUpside = ((avgTarget - currentPrice) / currentPrice) * 100;

  const consensus = {
    buy:  recommendations.filter(r => r.rating === 'Buy').length,
    hold: recommendations.filter(r => r.rating === 'Hold').length,
    sell: recommendations.filter(r => r.rating === 'Sell').length,
  };

  const ratingColor = (rating: string) =>
    rating === 'Buy' ? '#22C55E' : rating === 'Hold' ? '#F59E0B' : '#EF4444';

  const card = (label: string, count: number, color: string) => (
    <div style={{
      background: 'rgba(17,24,39,0.6)',
      border: `1px solid ${color}33`,
      borderRadius: 10, padding: '14px 16px', textAlign: 'center',
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#64748B', letterSpacing: '0.1em', marginBottom: 6 }}>
        {label.toUpperCase()}
      </div>
      <div style={{ fontSize: 28, fontWeight: 900, color, fontFamily: 'JetBrains Mono, monospace' }}>
        {count}
      </div>
    </div>
  );

  return (
    <div style={{
      background: 'rgba(17,24,39,0.85)',
      border: '1px solid rgba(30,41,59,0.8)',
      borderRadius: 16, padding: 24,
    }}>
      <div style={{
        fontFamily: 'Cinzel, serif', fontWeight: 700,
        color: '#F8FAFC', fontSize: 18, marginBottom: 24,
      }}>
        Analyst Recommendations
      </div>

      {/* Consensus counts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
        {card('Buy', consensus.buy, '#22C55E')}
        {card('Hold', consensus.hold, '#F59E0B')}
        {card('Sell', consensus.sell, '#EF4444')}
      </div>

      {/* Target Price */}
      <div style={{
        padding: '16px 20px',
        background: 'rgba(31,41,59,0.5)',
        border: '1px solid rgba(51,65,85,0.4)',
        borderRadius: 12, marginBottom: 20,
      }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#64748B', letterSpacing: '0.1em', marginBottom: 12 }}>
          CONSENSUS TARGET
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <div style={{ fontSize: 11, color: '#64748B', marginBottom: 4 }}>{t("analyst.avgTargetPrice")}</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: '#D4AF37', fontFamily: 'JetBrains Mono, monospace' }}>
              {avgTarget.toFixed(2)}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: '#64748B', marginBottom: 4 }}>{t("analyst.upsidePotential")}</div>
            <div style={{
              fontSize: 24, fontWeight: 900,
              color: avgUpside >= 0 ? '#22C55E' : '#EF4444',
              fontFamily: 'JetBrains Mono, monospace',
            }}>
              {avgUpside >= 0 ? '+' : ''}{avgUpside.toFixed(1)}%
            </div>
          </div>
        </div>
      </div>

      {/* Recent Calls */}
      <div>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#64748B', letterSpacing: '0.1em', marginBottom: 12 }}>
          RECENT CALLS
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {recommendations.slice(0, 5).map((rec, idx) => (
            <div key={idx} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '12px 14px',
              background: 'rgba(31,41,59,0.5)',
              border: '1px solid rgba(51,65,85,0.4)',
              borderRadius: 10,
              transition: 'border-color 0.15s',
            }}
              onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(212,175,55,0.3)'}
              onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(51,65,85,0.4)'}
            >
              <div>
                {rec.symbol ? (
                  <Link href={`/stock/${rec.symbol}`} style={{ textDecoration: 'none' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#D4AF37' }}>
                      {rec.firm} →
                    </div>
                  </Link>
                ) : (
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#F8FAFC' }}>{rec.firm}</div>
                )}
                <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>{rec.date}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{
                  fontSize: 13, fontWeight: 700,
                  fontFamily: 'JetBrains Mono, monospace',
                  color: ratingColor(rec.rating),
                }}>
                  {rec.rating}
                </div>
                <div style={{ fontSize: 11, color: '#64748B', fontFamily: 'JetBrains Mono, monospace', marginTop: 2 }}>
                  {safeNum(rec.targetPrice).toFixed(0)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}