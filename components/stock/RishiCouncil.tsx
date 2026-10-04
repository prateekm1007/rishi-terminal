// components/stock/RishiCouncil.tsx
// R4-04 (Round 13): the Rishi Council view — consensus plus dissent.
// SERVER component: the council is computed on the server (lib/consensus/
// council.ts) and rendered to static HTML inside the ISR page — zero
// client JS. It shows, for every Rishi:
//   - pass (score >= 55) / fail / no-verdict ("insufficient data");
//   - WHY: the strongest drivers for a pass, the weakest for a fail
//     (each pillar's published detail carries the input + threshold);
//   - WHAT WOULD CHANGE for a failing scorer to pass — every step was
//     VERIFIED by re-running the actual scorer (the acceptance test
//     re-verifies the engine over the whole universe).

import type { CouncilReport } from '@/lib/consensus/council';

interface Props {
  council: CouncilReport;
}

const STATUS: Record<CouncilReport['rows'][number]['status'], { glyph: string; color: string; word: string }> = {
  pass: { glyph: '✓', color: '#00BA7C', word: 'pass' },
  fail: { glyph: '✗', color: '#F4212E', word: 'fail' },
  'no-verdict': { glyph: '—', color: '#64748B', word: 'no verdict' },
};

export function RishiCouncil({ council }: Props) {
  return (
    <div className="card-sacred" style={{ padding: 28, marginTop: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
        <h2 className="philosophy-heading" style={{ fontSize: 20, margin: 0 }}>
          Rishi Council — Consensus &amp; Dissent
        </h2>
        <span style={{ fontSize: 11, color: '#64748B', fontFamily: 'var(--font-mono)' }}>
          pass {council.passCount} · fail {council.failCount} · no verdict {council.noVerdictCount} · bar ≥ {council.passBar}
        </span>
      </div>
      <p style={{ fontSize: 12, color: '#64748B', marginTop: 6, lineHeight: 1.6 }}>
        Where the panel disagrees, this says who and why — and, for every dissenting Rishi, what would
        have to change for the verdict to flip (computed from each framework&apos;s own thresholds and
        verified by re-running it). Educational simulation — not the real people, not investment advice.
      </p>

      <div style={{ marginTop: 16, display: 'grid', gap: 10 }}>
        {council.rows.map((row) => {
          const st = STATUS[row.status];
          return (
            <div
              key={row.name}
              style={{
                display: 'grid',
                gridTemplateColumns: '24px 1fr',
                gap: 12,
                padding: '12px 14px',
                borderRadius: 10,
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <span
                aria-label={st.word}
                style={{ color: st.color, fontFamily: 'var(--font-mono)', fontSize: 14, lineHeight: 1.5 }}
              >
                {st.glyph}
              </span>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
                  <span style={{ fontSize: 13, color: '#F8FAFC' }}>
                    {row.full}{' '}
                    <span style={{ fontSize: 11, color: '#64748B' }}>
                      {row.label} · {st.word}
                    </span>
                  </span>
                  <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: row.score === null ? '#64748B' : '#F8FAFC' }}>
                    {row.score === null ? '—' : row.score}
                    <span style={{ color: '#64748B' }}> /100</span>
                  </span>
                </div>

                <ul style={{ margin: '6px 0 0', paddingLeft: 16, listStyle: 'disc' }}>
                  {row.drivers.map((d, i) => (
                    <li key={i} style={{ fontSize: 12, color: '#94A3B8', lineHeight: 1.6 }}>
                      <span style={{ color: '#CBD5E1' }}>{d.pillar}</span> · {d.detail}
                    </li>
                  ))}
                </ul>

                {row.status === 'fail' && row.change && row.change.steps.length > 0 && (
                  <p style={{ fontSize: 12, color: '#F59E0B', margin: '8px 0 0', lineHeight: 1.6 }}>
                    <span style={{ color: '#64748B' }}>to pass → </span>
                    {row.change.steps.join('; ')}
                    <span style={{ color: '#64748B' }}> (verified by re-running the scorer)</span>
                  </p>
                )}
                {row.status === 'fail' && row.change === null && (
                  <p style={{ fontSize: 12, color: '#64748B', margin: '8px 0 0' }}>
                    no single-input path to a pass — the dissent is structural
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
