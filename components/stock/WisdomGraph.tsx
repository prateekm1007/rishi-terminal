'use client';

import { WisdomGraph, WisdomNode } from '../../lib/wisdom/graph';
import Link from 'next/link';

interface Props {
  graph: WisdomGraph;
}

function getNodeColor(type: WisdomNode['type']): string {
  switch (type) {
    case 'case_study':  return '#f59e0b';
    case 'historical':  return '#60a5fa';
    case 'quote':       return '#34d399';
    case 'warning':     return '#f87171';
    case 'parallel':    return '#c084fc';
    case 'peer':        return '#94a3b8';
    default:            return '#71717a';
  }
}

function getNodeIcon(type: WisdomNode['type']): string {
  switch (type) {
    case 'case_study':  return '📚';
    case 'historical':  return '🏛';
    case 'quote':       return '💬';
    case 'warning':     return '⚠️';
    case 'parallel':    return '🔗';
    case 'peer':        return '📊';
    default:            return '•';
  }
}

function getNodeLabel(type: WisdomNode['type']): string {
  switch (type) {
    case 'case_study':  return 'CASE STUDY';
    case 'historical':  return 'HISTORICAL';
    case 'quote':       return 'WISDOM';
    case 'warning':     return 'WARNING';
    case 'parallel':    return 'PARALLEL';
    case 'peer':        return 'PEER';
    default:            return 'NODE';
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
        width: '100%',
      }}
    >
      {/* ── Header ─────────────────────────────────────────── */}
      <div
        style={{
          padding: '20px 24px',
          background: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border-primary)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <span style={{ fontSize: 22 }}>🧠</span>
          <h3
            style={{
              fontSize: 17,
              fontFamily: 'Cinzel, serif',
              color: 'var(--text-primary)',
              letterSpacing: 1,
              margin: 0,
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
            margin: '0 0 12px 0',
          }}
        >
          {graph.summary}
        </p>

        {/* Connection pills */}
        {graph.connections.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {graph.connections.map((conn, i) => (
              <div
                key={i}
                style={{
                  fontSize: 11,
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span style={{ color: '#f59e0b', fontWeight: 700 }}>→</span>
                {conn}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Wisdom Nodes ───────────────────────────────────── */}
      <div style={{ padding: '20px 20px 0 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {graph.nodes.map((node, i) => (
          <div
            key={i}
            style={{
              background: 'var(--bg-secondary)',
              borderRadius: 10,
              padding: '14px 14px 12px 14px',
              borderLeft: `3px solid ${getNodeColor(node.type)}`,
              position: 'relative',
            }}
          >
            {/* Type badge row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <span style={{ fontSize: 14 }}>{getNodeIcon(node.type)}</span>
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

              {/* Relevance circle — only shown when no year */}
              {!node.year && (
                <span
                  style={{
                    marginLeft: 'auto',
                    fontSize: 9,
                    fontFamily: 'JetBrains Mono',
                    color: getNodeColor(node.type),
                    background: `${getNodeColor(node.type)}18`,
                    border: `1px solid ${getNodeColor(node.type)}50`,
                    borderRadius: '50%',
                    width: 28,
                    height: 28,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {node.relevance}
                </span>
              )}
            </div>

            {/* Title */}
            <h4
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--text-primary)',
                marginBottom: 6,
                lineHeight: 1.4,
                paddingRight: node.year ? 0 : 0,
              }}
            >
              {node.title}
            </h4>

            {/* Content */}
            <p
              style={{
                fontSize: 12,
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
                gap: 8,
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  color: 'var(--text-muted)',
                  fontStyle: 'italic',
                  flex: 1,
                  minWidth: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {node.source}
              </span>

              {node.rishi && (
                <span
                  style={{
                    fontSize: 9,
                    fontFamily: 'JetBrains Mono',
                    padding: '2px 8px',
                    background: `${getNodeColor(node.type)}18`,
                    color: getNodeColor(node.type),
                    borderRadius: 4,
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  {node.rishi}
                </span>
              )}
            </div>
          </div>
        ))}

        {graph.nodes.length === 0 && (
          <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🌱</div>
            <p style={{ fontSize: 13, lineHeight: 1.6 }}>
              Wisdom graph is growing. More historical connections will appear as the knowledge base expands.
            </p>
          </div>
        )}
      </div>

      {/* ── Related Stocks ─────────────────────────────────── */}
      {graph.relatedStocks.length > 0 && (
        <div
          style={{
            margin: '20px 20px 0 20px',
            background: 'var(--bg-secondary)',
            borderRadius: 10,
            overflow: 'hidden',
            border: '1px solid var(--border-primary)',
          }}
        >
          <div
            style={{
              padding: '10px 14px',
              borderBottom: '1px solid var(--border-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span style={{ fontSize: 14 }}>🔗</span>
            <span
              style={{
                fontSize: 10,
                fontFamily: 'JetBrains Mono',
                color: 'var(--text-muted)',
                letterSpacing: 1,
                fontWeight: 700,
              }}
            >
              RELATED STOCKS
            </span>
          </div>

          <div style={{ padding: '8px 0' }}>
            {graph.relatedStocks.map((s, i) => (
              <Link
                key={s.symbol}
                href={`/stock/${s.symbol.toLowerCase()}`}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  padding: '10px 14px',
                  borderBottom: i < graph.relatedStocks.length - 1 ? '1px solid var(--border-primary)' : 'none',
                  textDecoration: 'none',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(245,158,11,0.06)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.background = 'transparent';
                }}
              >
                <span
                  style={{
                    fontSize: 10,
                    fontFamily: 'JetBrains Mono',
                    color: '#f59e0b',
                    fontWeight: 700,
                    padding: '2px 6px',
                    background: 'rgba(245,158,11,0.12)',
                    borderRadius: 4,
                    whiteSpace: 'nowrap',
                    marginTop: 1,
                  }}
                >
                  {s.symbol}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 12,
                      color: 'var(--text-primary)',
                      fontWeight: 600,
                      marginBottom: 2,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {s.name}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: 'var(--text-muted)',
                      lineHeight: 1.4,
                    }}
                  >
                    {s.reason}
                  </div>
                </div>
                <span style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 2 }}>→</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── Footer ─────────────────────────────────────────── */}
      <div
        style={{
          margin: '20px 0 0 0',
          padding: '14px 24px',
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