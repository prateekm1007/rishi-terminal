'use client';

import { RishiDialogue, DialogueLine } from '../../lib/wisdom/dialogue';

interface Props {
  dialogues: RishiDialogue[];
}

function getEmotionColor(emotion: DialogueLine['emotion']): string {
  switch (emotion) {
    case 'agree': return 'var(--accent-green)';
    case 'optimistic': return 'var(--accent-gold)';
    case 'disagree': return 'var(--accent-red)';
    case 'concern': return '#f59e0b';
    default: return 'var(--text-secondary)';
  }
}

function getEmotionIcon(emotion: DialogueLine['emotion']): string {
  switch (emotion) {
    case 'agree': return '✓';
    case 'optimistic': return '↗';
    case 'disagree': return '✗';
    case 'concern': return '⚠';
    default: return '—';
  }
}

function getConsensusColor(consensus: RishiDialogue['consensus']): string {
  switch (consensus) {
    case 'strong': return 'var(--accent-green)';
    case 'moderate': return 'var(--accent-gold)';
    case 'divided': return 'var(--accent-red)';
  }
}

export function RishiDialogue({ dialogues }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      {dialogues.map((dialogue, idx) => (
        <div
          key={idx}
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-primary)',
            borderRadius: 12,
            overflow: 'hidden',
          }}
        >
          {/* Dialogue Header */}
          <div
            style={{
              padding: '20px 24px',
              background: 'var(--bg-secondary)',
              borderBottom: '1px solid var(--border-primary)',
            }}
          >
            <h3
              style={{
                fontSize: 18,
                fontFamily: 'Cinzel, serif',
                color: 'var(--text-primary)',
                marginBottom: 12,
                letterSpacing: 1,
              }}
            >
              {dialogue.topic}
            </h3>

            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    fontSize: 10,
                    fontFamily: 'JetBrains Mono',
                    color: 'var(--text-muted)',
                    letterSpacing: 1,
                  }}
                >
                  PARTICIPANTS:
                </span>
                {dialogue.participants.map((name, i) => (
                  <span
                    key={name}
                    style={{
                      fontSize: 11,
                      fontFamily: 'JetBrains Mono',
                      padding: '4px 10px',
                      background: 'var(--bg-primary)',
                      color: 'var(--accent-gold)',
                      borderRadius: 6,
                      fontWeight: 600,
                    }}
                  >
                    {name}
                  </span>
                ))}
              </div>

              <div style={{ marginLeft: 'auto' }}>
                <span
                  style={{
                    fontSize: 10,
                    fontFamily: 'JetBrains Mono',
                    padding: '4px 12px',
                    background: `${getConsensusColor(dialogue.consensus)}20`,
                    color: getConsensusColor(dialogue.consensus),
                    borderRadius: 6,
                    fontWeight: 700,
                    letterSpacing: 1,
                  }}
                >
                  {dialogue.consensus.toUpperCase()} CONSENSUS
                </span>
              </div>
            </div>
          </div>

          {/* Dialogue Lines */}
          <div style={{ padding: 24 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {dialogue.lines.map((line, lineIdx) => (
                <div
                  key={lineIdx}
                  style={{
                    display: 'flex',
                    gap: 16,
                    alignItems: 'flex-start',
                  }}
                >
                  {/* Speaker Badge */}
                  <div
                    style={{
                      minWidth: 100,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-end',
                      paddingTop: 4,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        fontFamily: 'Cinzel, serif',
                        color: 'var(--accent-gold)',
                        fontWeight: 600,
                        marginBottom: 4,
                      }}
                    >
                      {line.speaker}
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        color: getEmotionColor(line.emotion),
                        fontFamily: 'JetBrains Mono',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <span>{getEmotionIcon(line.emotion)}</span>
                      <span>{line.emotion}</span>
                    </div>
                  </div>

                  {/* Speech Bubble */}
                  <div
                    style={{
                      flex: 1,
                      background: 'var(--bg-secondary)',
                      padding: '16px 20px',
                      borderRadius: 12,
                      borderLeft: `3px solid ${getEmotionColor(line.emotion)}`,
                      position: 'relative',
                    }}
                  >
                    <p
                      style={{
                        fontSize: 14,
                        lineHeight: 1.7,
                        color: 'var(--text-primary)',
                        margin: 0,
                      }}
                    >
                      "{line.text}"
                    </p>

                    {/* Triangle pointer */}
                    <div
                      style={{
                        position: 'absolute',
                        left: -8,
                        top: 20,
                        width: 0,
                        height: 0,
                        borderTop: '8px solid transparent',
                        borderBottom: '8px solid transparent',
                        borderRight: '8px solid var(--bg-secondary)',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Summary Footer */}
          <div
            style={{
              padding: '16px 24px',
              background: 'var(--bg-secondary)',
              borderTop: '1px solid var(--border-primary)',
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontFamily: 'JetBrains Mono',
                color: 'var(--text-muted)',
                letterSpacing: 1,
                marginBottom: 6,
              }}
            >
              SYNTHESIS
            </div>
            <p
              style={{
                fontSize: 13,
                color: 'var(--text-secondary)',
                margin: 0,
                lineHeight: 1.6,
              }}
            >
              {dialogue.summary}
            </p>
          </div>
        </div>
      ))}

      {/* Philosophical Note */}
      <div
        style={{
          padding: 24,
          background: 'var(--bg-card)',
          border: '1px solid var(--border-primary)',
          borderRadius: 12,
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 32, marginBottom: 12 }}>🧘</div>
        <p
          style={{
            fontSize: 13,
            color: 'var(--text-muted)',
            fontStyle: 'italic',
            margin: 0,
            maxWidth: 600,
            marginLeft: 'auto',
            marginRight: 'auto',
            lineHeight: 1.7,
          }}
        >
          These dialogues are generated from each Rishi's actual scoring logic and insights.
          They represent genuine philosophical tensions between different investment
          approaches.
        </p>
      </div>
    </div>
  );
}