import React from 'react';
import { DisagreementMeter } from './DisagreementMeter';
import { PhilosophyDivergenceMap } from './PhilosophyDivergenceMap';
import { OpposingViewsPanel } from './OpposingViewsPanel';
import { KnowledgeGapsCard } from './KnowledgeGapsCard';
import { ContextualInstabilityBadge } from './ContextualInstabilityBadge';

interface Props {
  disagreementIndex: number;
  disagreementLabel: string;
  institutionalImplication: string;
  philosophyDivergence: any;
  conflictPairs: any[];
  contextualInstability: number;
  knowledgeCoverage: number;
  knowledgeGaps: string[];
  opposingViews: string[];
  epistemicWarnings: string[];
  confidenceInterval?: { lower: number; upper: number };
  dissidents?: string[];
  majorityView?: string;
}

export const EpistemicSummaryCard: React.FC<Props> = ({
  disagreementIndex,
  disagreementLabel,
  institutionalImplication,
  philosophyDivergence,
  conflictPairs,
  contextualInstability,
  knowledgeCoverage,
  knowledgeGaps,
  opposingViews,
  epistemicWarnings,
  confidenceInterval,
  dissidents,
  majorityView,
}) => {
  const hasDivergence = philosophyDivergence && Object.keys(philosophyDivergence).length > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* Disagreement Meter */}
      <DisagreementMeter
        disagreementIndex={disagreementIndex}
        label={disagreementLabel}
      />

      {/* Instability Badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <ContextualInstabilityBadge contextualInstability={contextualInstability} />
        {majorityView && (
          <span style={{
            fontFamily: 'monospace',
            fontSize: '11px',
            color: '#D4AF37',
            padding: '3px 8px',
            border: '1px solid rgba(212,175,55,0.3)',
            borderRadius: '4px',
          }}>
            MAJORITY: {majorityView.replace('_', ' ')}
          </span>
        )}
      </div>

      {/* Institutional View */}
      <div style={{
        padding: '14px',
        background: 'rgba(212,175,55,0.05)',
        border: '1px solid rgba(212,175,55,0.2)',
        borderRadius: '8px',
      }}>
        <div style={{
          fontSize: '10px',
          fontWeight: 700,
          color: '#D4AF37',
          letterSpacing: '0.1em',
          marginBottom: '6px',
          textTransform: 'uppercase',
        }}>
          Institutional Implication
        </div>
        <p style={{
          fontSize: '12px',
          color: 'var(--text-primary)',
          lineHeight: '1.6',
          margin: 0,
        }}>
          {institutionalImplication}
        </p>
      </div>

      {/* Epistemic Warnings */}
      {epistemicWarnings && epistemicWarnings.length > 0 && (
        <div style={{
          padding: '14px',
          background: 'rgba(239,68,68,0.05)',
          border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: '8px',
        }}>
          <div style={{
            fontSize: '10px',
            fontWeight: 700,
            color: '#ef4444',
            letterSpacing: '0.1em',
            marginBottom: '8px',
            textTransform: 'uppercase',
          }}>
            Epistemic Warnings
          </div>
          {epistemicWarnings.map((w, i) => (
            <div key={i} style={{
              fontSize: '12px',
              color: '#fca5a5',
              marginBottom: i < epistemicWarnings.length - 1 ? '6px' : '0',
              display: 'flex',
              gap: '8px',
            }}>
              <span style={{ color: '#ef4444', flexShrink: 0 }}>&#9679;</span>
              {w}
            </div>
          ))}
        </div>
      )}

      {/* Philosophy Divergence Map */}
      {hasDivergence && (
        <PhilosophyDivergenceMap philosophyDivergence={philosophyDivergence} />
      )}

      {/* Conflict Pairs */}
      {conflictPairs && conflictPairs.length > 0 && (
        <div style={{
          padding: '14px',
          background: 'rgba(239,68,68,0.05)',
          border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: '8px',
        }}>
          <div style={{
            fontSize: '10px',
            fontWeight: 700,
            color: '#ef4444',
            letterSpacing: '0.1em',
            marginBottom: '10px',
            textTransform: 'uppercase',
          }}>
            Major Conflicts
          </div>
          {conflictPairs.map((conflict, idx) => (
            <div key={idx} style={{
              padding: '10px',
              background: 'rgba(239,68,68,0.08)',
              borderRadius: '6px',
              marginBottom: idx < conflictPairs.length - 1 ? '8px' : '0',
              fontSize: '12px',
              color: '#fca5a5',
            }}>
              <strong style={{ color: '#ef4444' }}>{conflict.philosophy1}</strong>
              <span style={{ color: '#666', margin: '0 8px' }}>vs</span>
              <strong style={{ color: '#ef4444' }}>{conflict.philosophy2}</strong>
              <span style={{ color: '#888', marginLeft: '8px' }}>
                — {conflict.scoreDelta}-point divergence
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Opposing Views */}
      <OpposingViewsPanel opposingViews={opposingViews} />

      {/* Knowledge Gaps */}
      <KnowledgeGapsCard knowledgeGaps={knowledgeGaps} />

      {/* Dissidents */}
      {dissidents && dissidents.length > 0 && (
        <div style={{
          padding: '14px',
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid var(--border-primary)',
          borderRadius: '8px',
        }}>
          <div style={{
            fontSize: '10px',
            fontWeight: 700,
            color: '#f59e0b',
            letterSpacing: '0.1em',
            marginBottom: '8px',
            textTransform: 'uppercase',
          }}>
            Dissenting Philosophers
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {dissidents.map((d, i) => (
              <span key={i} style={{
                fontSize: '11px',
                padding: '3px 10px',
                background: 'rgba(245,158,11,0.1)',
                border: '1px solid rgba(245,158,11,0.3)',
                borderRadius: '4px',
                color: '#f59e0b',
                fontFamily: 'monospace',
              }}>
                {d}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Confidence Interval + Coverage */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '12px',
      }}>
        {confidenceInterval && (
          <div style={{
            padding: '12px',
            background: 'rgba(212,175,55,0.05)',
            border: '1px solid rgba(212,175,55,0.15)',
            borderRadius: '8px',
            textAlign: 'center',
          }}>
            <div style={{
              fontSize: '10px',
              color: '#D4AF37',
              marginBottom: '6px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              Score Range
            </div>
            <div style={{
              fontFamily: 'monospace',
              fontSize: '16px',
              color: 'var(--text-primary)',
              fontWeight: 700,
            }}>
              {confidenceInterval.lower} — {confidenceInterval.upper}
            </div>
          </div>
        )}

        <div style={{
          padding: '12px',
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid var(--border-primary)',
          borderRadius: '8px',
          textAlign: 'center',
        }}>
          <div style={{
            fontSize: '10px',
            color: '#888',
            marginBottom: '6px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            Data Coverage
          </div>
          <div style={{
            fontFamily: 'monospace',
            fontSize: '16px',
            color: 'var(--text-primary)',
            fontWeight: 700,
          }}>
            {(knowledgeCoverage * 100).toFixed(0)}%
          </div>
        </div>
      </div>

    </div>
  );
};