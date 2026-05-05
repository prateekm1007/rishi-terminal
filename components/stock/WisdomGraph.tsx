'use client';

import { WisdomGraph, WisdomNode } from '../../lib/wisdom/graph';

interface Props {
  graph: WisdomGraph;
}

function getNodeColor(type: WisdomNode['type']): string {
  switch (type) {
    case 'case_study': return 'var(--accent-gold)';
    case 'historical': return '#60a5fa';
    case 'quote': return 'var(--accent-green)';
    case 'warning': return 'var(--accent-red)';
    case 'parallel': return '#c084fc';
    default: return 'var(--text-muted)';
  }
}

function getNodeIcon(type: WisdomNode['type']): string {
  switch (type) {
    case 'case_study': return '📚';
    case 'historical': return '🏛️';
    case 'quote': return '💬';
    case 'warning': return '⚠️';
    case 'parallel': return '🔗';
    default: return '•';
  }
}

function getNodeLabel(type: WisdomNode['type']): string {
  switch (type) {
    case 'case_study': return 'CASE STUDY';
    case 'historical': return 'HISTORICAL';
    case 'quote': return 'WISDOM';
    case 'warning': return 'WARNING';
    case 'parallel': return 'PARALLEL';
    default: return 'NODE';
  }
}

export function WisdomGraph({ graph }: Props) {
  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-primary)',
        borderRadius: 12,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '20px 24px',
          background: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border-primary)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <div style={{ fontSize: 24 }}>🧠</div>
          <h3
            style={{
              fontSize: 18,
              fontFamily: 'Cinzel, serif',
              color: 'var(--text-primary)',
              letterSpacing: 1,
            }}
          >
            Wisdom Graph
          </h3>
        </div>
        
        <p
          style={{
            fontSize: 12,
            color: 'var(--text-muted)',
            lineHeight: 1.6,
            marginBottom: 12,
          }}
        >
          {graph.summary}
        </p>

        {/* Connections */}
        {graph.connections.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {graph.connections.map((conn, i) => (
              <div
                key={i}
                style={{
                  fontSize: 11,
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <span style={{ color: 'var(--accent-gold)' }}>→</span>
                {conn}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Nodes */}
      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
        {graph.nodes.map((node, i) => (
          <div
            key={i}
            style={{
              background: 'var(--bg-secondary)',
              borderRadius: 10,
              padding: 16,
              borderLeft: `3px solid ${getNodeColor(node.type)}`,
              position: 'relative',
            }}
          >
            {/* Type Badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 16 }}>{getNodeIcon(node.type)}</span>
              <span
                style={{
                  fontSize: 9,
                  fontFamily: 'JetBrains Mono',
                  letterSpacing: 1,
                  color: getNodeColor(node.type),
                  fontWeight: 700,
                }}
              >
                {getNodeLabel(node.type)}
              </span>
              
              {node.year && (
                <span
                  style={{
                    marginLeft: 'auto',
                    fontSize: 10,
                    fontFamily: 'JetBrains Mono',
                    color: 'var(--text-muted)',
                  }}
                >
                  {node.year}
                </span>
              )}
            </div>

            {/* Title */}
            <h4
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: 'var(--text-primary)',
                marginBottom: 8,
                lineHeight: 1.4,
              }}
            >
              {node.title}
            </h4>

            {/* Content */}
            <p
              style={{
                fontSize: 13,
                color: 'var(--text-secondary)',
                lineHeight: 1.6,
                marginBottom: 10,
              }}
            >
              {node.content}
            </p>

            {/* Footer */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: 11,
                color: 'var(--text-muted)',
                fontStyle: 'italic',
              }}
            >
              <span>{node.source}</span>
              {node.rishi && (
                <span
                  style={{
                    fontFamily: 'JetBrains Mono',
                    fontSize: 10,
                    padding: '2px 8px',
                    background: `${getNodeColor(node.type)}20`,
                    color: getNodeColor(node.type),
                    borderRadius: 4,
                    fontStyle: 'normal',
                    fontWeight: 600,
                  }}
                >
                  {node.rishi}
                </span>
              )}
            </div>

            {/* Relevance indicator */}
            <div
              style={{
                position: 'absolute',
                top: 16,
                right: 16,
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: `${getNodeColor(node.type)}15`,
                border: `2px solid ${getNodeColor(node.type)}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 10,
                fontFamily: 'JetBrains Mono',
                fontWeight: 700,
                color: getNodeColor(node.type),
              }}
            >
              {node.relevance}
            </div>
          </div>
        ))}

        {graph.nodes.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: 32,
              color: 'var(--text-muted)',
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 16 }}>🌱</div>
            <p style={{ fontSize: 13, lineHeight: 1.6 }}>
              Wisdom graph is growing. More historical connections and insights will appear as the knowledge base expands.
            </p>
          </div>
        )}
      </div>

      {/* Footer Note */}
      <div
        style={{
          padding: '16px 24px',
          background: 'var(--bg-secondary)',
          borderTop: '1px solid var(--border-primary)',
          fontSize: 11,
          color: 'var(--text-muted)',
          textAlign: 'center',
          fontStyle: 'italic',
        }}
      >
        Curated wisdom from 50+ years of market history · Growing knowledge graph
      </div>
    </div>
  );
}