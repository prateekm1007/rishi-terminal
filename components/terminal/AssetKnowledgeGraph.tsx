'use client';

import { useState } from 'react';
import type { EliteKnowledgeGraph, DebateEntry, TechnicalEdgeEntry, TimelineEntry } from '../../lib/consensus/eliteGraph';

interface Props {
  graphData: EliteKnowledgeGraph;
  assetName: string;
  onClose: () => void;
}

const cardStyle = {
  padding: '16px',
  background: 'rgba(255,255,255,0.03)',
  borderRadius: '8px',
  borderTop: '1px solid var(--border-primary)',
  borderRight: '1px solid var(--border-primary)',
  borderBottom: '1px solid var(--border-primary)',
  borderLeft: '1px solid var(--border-primary)',
  marginBottom: '12px',
};

function getEventColor(event: string): string {
  if (event === 'buy_signal')  return '#22C55E';
  if (event === 'sell_signal') return '#EF4444';
  return '#FFD700';
}

function DebateCard({ entry }: { entry: DebateEntry }) {
  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '14px' }}>
          {entry.rishi}
        </div>
        <div style={{ fontSize: '14px', fontWeight: 700, color: entry.score >= 60 ? '#22C55E' : '#EF4444' }}>
          {entry.score.toFixed(0)}/100
        </div>
      </div>
      <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px', lineHeight: '1.5' }}>
        {entry.reasoning}
      </div>
      <div style={{ fontSize: '11px', color: '#D4AF37', letterSpacing: '0.05em' }}>
        KEY: {entry.keyMetric}
      </div>
    </div>
  );
}

function TechnicalCard({ edge }: { edge: TechnicalEdgeEntry }) {
  const stockVal = edge.stockValue ?? 0;
  const sectorVal = edge.sectorAvg ?? 0;
  const isGood = edge.higherIsBetter ? stockVal >= sectorVal : stockVal <= sectorVal;

  return (
    <div style={cardStyle}>
      <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px', fontSize: '14px' }}>
        {edge.metric}
      </div>
      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px', lineHeight: '1.5' }}>
        {edge.description}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
        <div>
          <div style={{ color: 'var(--text-muted)', fontSize: '10px', marginBottom: '4px', textTransform: 'uppercase' }}>
            Stock Value
          </div>
          <div style={{ fontWeight: 700, color: isGood ? '#22C55E' : '#EF4444', fontSize: '16px' }}>
            {stockVal.toFixed(2)} {edge.unit}
          </div>
        </div>
        <div>
          <div style={{ color: 'var(--text-muted)', fontSize: '10px', marginBottom: '4px', textTransform: 'uppercase' }}>
            Sector Avg
          </div>
          <div style={{ fontWeight: 700, color: '#FFD700', fontSize: '16px' }}>
            {sectorVal.toFixed(2)} {edge.unit}
          </div>
        </div>
      </div>
      <div style={{ fontSize: '11px', color: '#D4AF37' }}>
        {edge.insight}
      </div>
    </div>
  );
}

function TimelineCard({ entry }: { entry: TimelineEntry }) {
  const color = getEventColor(entry.event);
  return (
    <div style={{
      padding: '16px',
      background: 'rgba(255,255,255,0.03)',
      borderRadius: '8px',
      borderTop: '1px solid var(--border-primary)',
      borderRight: '1px solid var(--border-primary)',
      borderBottom: '1px solid var(--border-primary)',
      borderLeft: `4px solid ${color}`,
      marginBottom: '12px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
        <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '14px' }}>
          {entry.rishi}
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
          {entry.date}
        </div>
      </div>
      <div style={{ fontSize: '12px', fontWeight: 700, color: color, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {entry.event.replace(/_/g, ' ')}
      </div>
      <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
        {entry.trigger}
      </div>
    </div>
  );
}

export function AssetKnowledgeGraph({ graphData, assetName, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<'debate' | 'technical' | 'timeline'>('debate');

  if (!graphData) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
        Knowledge Graph data not available
      </div>
    );
  }

  const totalDebate = graphData.debate.bulls.length + graphData.debate.bears.length + graphData.debate.neutrals.length;

  const tabs = [
    { id: 'debate'    as const, label: `DEBATE (${totalDebate})` },
    { id: 'technical' as const, label: `TECHNICAL (${graphData.technicalEdge.length})` },
    { id: 'timeline'  as const, label: `TIMELINE (${graphData.timeline.length})` },
  ];

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.95)',
      zIndex: 2000,
      display: 'flex',
      flexDirection: 'column',
      backdropFilter: 'blur(4px)',
    }}>

      {/* Header */}
      <div style={{
        padding: '24px',
        borderTop: 'none',
        borderLeft: 'none',
        borderRight: 'none',
        borderBottom: '1px solid var(--border-primary)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexShrink: 0,
      }}>
        <div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
            Elite Knowledge Graph
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            {assetName} - Consensus Architecture
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'rgba(255,255,255,0.05)',
            borderTop: '1px solid var(--border-primary)',
            borderRight: '1px solid var(--border-primary)',
            borderBottom: '1px solid var(--border-primary)',
            borderLeft: '1px solid var(--border-primary)',
            borderRadius: '8px',
            color: 'var(--text-primary)',
            width: '40px',
            height: '40px',
            cursor: 'pointer',
            fontSize: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          X
        </button>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: '4px',
        padding: '12px 24px',
        borderTop: 'none',
        borderLeft: 'none',
        borderRight: 'none',
        borderBottom: '1px solid var(--border-primary)',
        background: 'rgba(255,255,255,0.01)',
        flexShrink: 0,
      }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '10px 20px',
              background: activeTab === tab.id ? 'rgba(212,175,55,0.15)' : 'transparent',
              borderTop: activeTab === tab.id ? '1px solid #D4AF37' : '1px solid transparent',
              borderRight: activeTab === tab.id ? '1px solid #D4AF37' : '1px solid transparent',
              borderBottom: activeTab === tab.id ? '1px solid #D4AF37' : '1px solid transparent',
              borderLeft: activeTab === tab.id ? '1px solid #D4AF37' : '1px solid transparent',
              borderRadius: '6px',
              color: activeTab === tab.id ? '#D4AF37' : 'var(--text-muted)',
              fontWeight: activeTab === tab.id ? 700 : 400,
              cursor: 'pointer',
              fontSize: '12px',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              transition: 'all 0.2s ease',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>

        {activeTab === 'debate' && (
          <div>
            {graphData.debate.bulls.length > 0 && (
              <div style={{ marginBottom: '28px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#22C55E', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  [UP] BULL ARGUMENTS ({graphData.debate.bulls.length})
                </div>
                {graphData.debate.bulls.map((entry, idx) => (
                  <DebateCard key={idx} entry={entry} />
                ))}
              </div>
            )}

            {graphData.debate.bears.length > 0 && (
              <div style={{ marginBottom: '28px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#EF4444', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  [DOWN] BEAR ARGUMENTS ({graphData.debate.bears.length})
                </div>
                {graphData.debate.bears.map((entry, idx) => (
                  <DebateCard key={idx} entry={entry} />
                ))}
              </div>
            )}

            {graphData.debate.neutrals.length > 0 && (
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#FFD700', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  [~] NEUTRAL POSITIONS ({graphData.debate.neutrals.length})
                </div>
                {graphData.debate.neutrals.map((entry, idx) => (
                  <DebateCard key={idx} entry={entry} />
                ))}
              </div>
            )}

            {totalDebate === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '48px' }}>
                No debate data available
              </div>
            )}
          </div>
        )}

        {activeTab === 'technical' && (
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#D4AF37', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              TECHNICAL EDGE ({graphData.technicalEdge.length})
            </div>
            {graphData.technicalEdge.length > 0
              ? graphData.technicalEdge.map((edge, idx) => <TechnicalCard key={idx} edge={edge} />)
              : <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '48px' }}>No technical data available</div>
            }
          </div>
        )}

        {activeTab === 'timeline' && (
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#D4AF37', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              SIGNAL TIMELINE ({graphData.timeline.length})
            </div>
            {graphData.timeline.length > 0
              ? graphData.timeline.map((entry, idx) => <TimelineCard key={idx} entry={entry} />)
              : <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '48px' }}>No timeline data available</div>
            }
          </div>
        )}

      </div>
    </div>
  );
}