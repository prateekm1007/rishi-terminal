'use client';

import { ConsensusResult } from '../../lib/consensus/types';

interface Props {
  consensus: ConsensusResult;
}

export function ConsensusHero({ consensus }: Props) {
  const score = consensus.consensus;

  const scoreColor = score >= 75 ? '#00BA7C' : score >= 55 ? '#FFD700' : score >= 35 ? '#f59e0b' : '#F4212E';
  const barColor   = score >= 75 ? '#00BA7C' : score >= 55 ? '#FFD700' : score >= 35 ? '#f59e0b' : '#F4212E';

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
              Tension: <span style={{ color: score >= 55 ? '#00BA7C' : '#f59e0b' }}>{consensus.tension}</span>
            </span>
            <span style={{ color: 'rgba(51,65,85,0.5)' }}>ƒ¢¢"š¬‚¢</span>
            <span style={{ color: '#64748B' }}>
              Spread: <span style={{ color: '#F8FAFC', fontFamily: 'monospace' }}>{consensus.tensionSpread.toFixed(0)} pts</span>
            </span>
          </div>
        </div>

        {/* Big Score */}
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '64px', fontWeight: 900, fontFamily: 'JetBrains Mono, monospace', color: scoreColor, lineHeight: 1 }}>
            {score}
          </div>
          <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>/ 100</div>
        </div>

      </div>

      {/* Score Bar */}
      <div style={{ height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden', marginBottom: '20px' }}>
        <div style={{ width: `${score}%`, height: '100%', background: barColor, borderRadius: '3px', transition: 'width 1s ease' }} />
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        {[
          { label: 'Rishis Analyzed', value: consensus.scores.length.toString(), color: '#F8FAFC' },
          { label: `Top Bull: ${consensus.topBull?.name ?? 'N/A'}`, value: (consensus.topBull?.score ?? 0).toString(), color: '#00BA7C' },
          { label: `Top Bear: ${consensus.topBear?.name ?? 'N/A'}`, value: (consensus.topBear?.score ?? 0).toString(), color: '#F4212E' },
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
