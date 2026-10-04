'use client';

import type { SanitizedConsensus } from '../../lib/consensus/sanitize';
import { DataValue } from '@/components/DataValue'; // P0-06: provenance for seed-derived spread

interface Props {
  consensus: SanitizedConsensus;
}

export function ConsensusHero({ consensus }: Props) {
  const score = consensus.consensus;
  // T11: null consensus ("Insufficient Data") renders an em dash, muted colors,
  // and an empty bar — never 0, never NaN.
  const hasScore = score !== null;

  const scoreColor = !hasScore ? '#64748B' : score >= 75 ? '#00BA7C' : score >= 55 ? '#FFD700' : score >= 35 ? '#f59e0b' : '#F4212E';
  const barColor   = scoreColor;

  return (
    <div className="card-sacred" style={{ padding: '28px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' }}>

        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '10px', color: '#64748B', letterSpacing: '0.15em', fontFamily: 'Cinzel, serif', marginBottom: '8px' }}>
            RISHI CONSENSUS
          </div>
          <div style={{ fontSize: '22px', fontFamily: 'Cinzel, serif', fontWeight: 700, color: '#F8FAFC', marginBottom: '10px' }}>
            {consensus.category}
          </div>
          <div style={{ display: 'flex', gap: '16px', fontSize: '13px' }}>
            <span style={{ color: '#64748B' }}>
              Tension: <span style={{ color: hasScore && score >= 55 ? '#00BA7C' : '#f59e0b' }}>{consensus.tension}</span>
            </span>
            <span style={{ color: 'rgba(51,65,85,0.5)' }}>•</span>
            <span style={{ color: '#64748B' }}>
              Spread: <span style={{ color: '#F8FAFC', fontFamily: 'monospace' }}><DataValue sourced={{ value: consensus.tensionSpread, source: 'seed', asOf: null }} digits={0} /> pts</span>
            </span>
            <span style={{ color: 'rgba(51,65,85,0.5)' }}>•</span>
            {/* S2-06: the whole-panel disagreement metric (docs/methodology/dispersion.md).
                null = fewer than 2 valid verdicts — one voice is not agreement, and
                showing σ 0 would pretend it is. */}
            <span style={{ color: '#64748B' }}>
              Disagreement σ:{' '}
              <span style={{ color: '#F8FAFC', fontFamily: 'monospace' }}>
                {consensus.dispersion === null ? '\u2014' : consensus.dispersion.toFixed(1)}
              </span>
              {consensus.dispersion !== null && (
                <span style={{ color: consensus.dispersion < 8 ? '#00BA7C' : consensus.dispersion < 18 ? '#f59e0b' : '#F4212E' }}>
                  {consensus.dispersion < 8 ? ' · aligned' : consensus.dispersion < 18 ? ' · split' : ' · divided'}
                </span>
              )}
            </span>
          </div>
        </div>

        {/* Big Score */}
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '64px', fontWeight: 900, fontFamily: 'JetBrains Mono, monospace', color: scoreColor, lineHeight: 1 }}>
            {hasScore ? score : '\u2014'}
          </div>
          <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>/ 100</div>
        </div>

      </div>

      {/* Score Bar */}
      <div style={{ height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden', marginBottom: '20px' }}>
        <div style={{ width: hasScore ? `${score}%` : '0%', height: '100%', background: barColor, borderRadius: '3px', transition: 'width 1s ease' }} />
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        {[
          { label: 'Rishis Analyzed', value: consensus.scoresCount.toString(), color: '#F8FAFC' },
          { label: `Top Bull: ${consensus.topBull.name}`, value: consensus.topBull.score === null ? '\u2014' : String(consensus.topBull.score), color: '#00BA7C' },
          { label: `Top Bear: ${consensus.topBear.name}`, value: consensus.topBear.score === null ? '\u2014' : String(consensus.topBear.score), color: '#F4212E' },
        ].map((stat, idx) => (
          <div key={idx} style={{ textAlign: 'center', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(51,65,85,0.5)' }}>
            <div style={{ fontSize: '24px', fontWeight: 700, fontFamily: 'monospace', color: stat.color }}>
              {stat.value}
            </div>
            <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}