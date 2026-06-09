'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

import { STOCKS } from '@/data/stocks/index';
import { buildConsensus } from '@/lib/consensus';
import { addHolding } from '@/lib/portfolio/index';
import { useLivePrices } from '@/hooks/useLivePrices';
import { useLanguage } from '../../lib/language';
import type { ConsensusResult, RishiScore } from '@/lib/consensus/types';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface WatchlistItem {
  symbol: string;
  addedDate: string;
  notes?: string;
  conviction?: number;
}

interface PromoteDialog {
  symbol: string;
  avgPrice: number;
  suggestedShares: number;
  shares: number;
  keepInWatchlist: boolean;
}

interface CatalystFilter {
  highConviction: boolean;
  nearTerm: boolean;
  earningsSeason: boolean;
}

const STORAGE_KEY = 'rishi_watchlist_v3';

// ─────────────────────────────────────────────────────────────────────────────
// PURE HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function scoreColor(s: number): string {
  return s >= 75 ? '#22C55E' : s >= 55 ? '#D4AF37' : '#EF4444';
}

function changeColor(v: number): string {
  return v > 0 ? '#22C55E' : v < 0 ? '#EF4444' : '#64748B';
}

function convictionLabel(c: number): string {
  return c >= 9 ? 'Max Conviction' : c >= 7 ? 'High' : c >= 5 ? 'Moderate' : c >= 3 ? 'Low' : 'Speculative';
}

function convictionColor(c: number): string {
  return c >= 9 ? '#22C55E' : c >= 7 ? '#D4AF37' : c >= 5 ? '#94A3B8' : '#EF4444';
}

// ─────────────────────────────────────────────────────────────────────────────
// CATALYST ENGINE — PURE FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

function getConsensusProb(spread: number): { pct: number; label: string; color: string } {
  if (spread < 20) return { pct: 88, label: 'Strong Consensus', color: '#22C55E' };
  if (spread < 40) return { pct: 74, label: 'Mild Disagreement', color: '#D4AF37' };
  if (spread < 60) return { pct: 59, label: 'Moderate Disagreement', color: '#F59E0B' };
  return { pct: 42, label: 'Significant Disagreement', color: '#EF4444' };
}

function getTimeline(topBullName: string): { short: string; color: string } {
  const n = topBullName.toLowerCase();
  if (n.includes('graham') || n.includes('schloss') || n.includes('greenblatt'))
    return { short: '0–3 months (Near-term)', color: '#22C55E' };
  if (n.includes('lynch') || n.includes('fisher') || n.includes('templeton'))
    return { short: '3–12 months (Medium-term)', color: '#D4AF37' };
  if (n.includes('jhunjhunwala') || n.includes('damani') || n.includes('kacholia') || n.includes('pabrai'))
    return { short: '12–36 months (Long-term)', color: '#8B5CF6' };
  return { short: '6–24 months (Long-term)', color: '#3B82F6' };
}

function getCatalystTitle(c: ConsensusResult): string {
  const bull = c.topBull;
  const label = (bull.label || '').toLowerCase();
  const score = c.consensus;
  if (label.includes('moat') || label.includes('quality'))
    return score >= 75 ? 'Durable Moat Expansion + FCF Compounding' : 'Moat Under Pressure — Watch ROCE Trend';
  if (label.includes('value') || label.includes('deep'))
    return score >= 70 ? 'Deep Value Unlock + Balance Sheet Strength' : 'Value Trap Risk — Execution Unproven';
  if (label.includes('growth') || label.includes('multibagger'))
    return score >= 75 ? 'High-Growth Upcycle + Revenue Visibility' : 'Growth Decelerating — Monitor Margins';
  if (label.includes('conviction'))
    return 'Conviction Multibagger — Management Execution Key';
  return score >= 75 ? 'Multi-Factor Strength Across Rishi Council' : 'Mixed Signals — Council Divided';
}

function getCatalystTypes(c: ConsensusResult): Array<{ label: string; strength: string; prob: number; impact: string; horizon: string }> {
  const out: Array<{ label: string; strength: string; prob: number; impact: string; horizon: string }> = [];
  const comps = c.topBull.comps || [];
  const topScore = c.consensus;

  const roceComp = comps.find(x => x.label.toLowerCase().includes('roce') || x.label.toLowerCase().includes('roe'));
  const growthComp = comps.find(x => x.label.toLowerCase().includes('growth') || x.label.toLowerCase().includes('cagr'));
  const valComp = comps.find(x => x.label.toLowerCase().includes('p/e') || x.label.toLowerCase().includes('ncav') || x.label.toLowerCase().includes('p/b'));
  const promoComp = comps.find(x => x.label.toLowerCase().includes('promoter') || x.label.toLowerCase().includes('management'));
  const fcfComp = comps.find(x => x.label.toLowerCase().includes('fcf') || x.label.toLowerCase().includes('cash'));

  if (roceComp && roceComp.v >= 60) {
    out.push({ label: 'Quality / Moat Expansion', strength: roceComp.v >= 80 ? 'High' : 'Medium', prob: Math.round(topScore * 0.85), impact: roceComp.v >= 80 ? '+12–22%' : '+6–12%', horizon: '6–18 months' });
  }
  if (growthComp && growthComp.v >= 55) {
    out.push({ label: 'Revenue & Earnings Growth', strength: growthComp.v >= 75 ? 'High' : 'Medium', prob: Math.round(topScore * 0.80), impact: growthComp.v >= 75 ? '+15–30%' : '+8–15%', horizon: '3–12 months' });
  }
  if (valComp && valComp.v >= 50) {
    out.push({ label: 'Valuation Re-rating', strength: valComp.v >= 70 ? 'High' : 'Medium', prob: Math.round(topScore * 0.70), impact: '+8–18%', horizon: '3–9 months' });
  }
  if (promoComp && promoComp.v >= 60) {
    out.push({ label: 'Governance / Promoter Confidence', strength: promoComp.v >= 80 ? 'High' : 'Medium', prob: Math.round(topScore * 0.75), impact: '+5–10%', horizon: '6–24 months' });
  }
  if (fcfComp && fcfComp.v >= 55) {
    out.push({ label: 'FCF Generation & Capital Return', strength: fcfComp.v >= 75 ? 'High' : 'Medium', prob: Math.round(topScore * 0.78), impact: '+6–14%', horizon: '12–24 months' });
  }
  if (out.length === 0) {
    out.push({ label: 'Sectoral Tailwinds', strength: topScore >= 65 ? 'Medium' : 'Low', prob: Math.round(topScore * 0.65), impact: '+5–12%', horizon: '6–18 months' });
  }
  return out;
}

function getActionVerdict(score: number, spread: number, topBullName: string): { text: string; color: string; detail: string } {
  if (score >= 80 && spread < 30)
    return { text: 'Strong Buy — Add to Core Portfolio', color: '#22C55E', detail: `${topBullName} leads a near-unanimous Council. Thesis robust at current levels.` };
  if (score >= 75 && spread < 40)
    return { text: 'High Conviction Buy', color: '#22C55E', detail: `Council broadly agrees. Accumulate on any weakness. Monitor quarterly execution.` };
  if (score >= 65 && spread < 40)
    return { text: 'Accumulate on Dips', color: '#D4AF37', detail: `Solid thesis but mild disagreement on valuation. Build position gradually.` };
  if (score >= 55 && spread < 30)
    return { text: 'Monitor Closely — Thesis Forming', color: '#3B82F6', detail: `Early-stage conviction. Wait for earnings confirmation before adding size.` };
  if (spread > 60)
    return { text: 'Wait for Clarity — Council Divided', color: '#EF4444', detail: `Sharp philosophical disagreement. Risk of permanent capital loss if thesis wrong.` };
  return { text: 'Cautious — Below Conviction Threshold', color: '#94A3B8', detail: `Insufficient Rishi alignment. Consider alternatives with better risk/reward.` };
}

function getRishiConvictionLabel(score: number): string {
  if (score >= 80) return 'Very High';
  if (score >= 65) return 'High';
  if (score >= 50) return 'Moderate';
  if (score >= 35) return 'Low';
  return 'Very Low';
}

function getImpactOnValuation(score: number): string {
  if (score >= 80) return '+15–25%';
  if (score >= 65) return '+8–15%';
  if (score >= 50) return '+3–8%';
  return 'Negative / Unclear';
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENT: Rishi Catalyst Engine Panel
// ─────────────────────────────────────────────────────────────────────────────

function CatalystEngine({ c }: { c: ConsensusResult }) {
  const [showAllRishis, setShowAllRishis] = useState(false);

  const prob = getConsensusProb(c.tensionSpread);
  const timeline = getTimeline(c.topBull.full);
  const title = getCatalystTitle(c);
  const catalystTypes = getCatalystTypes(c);
  const verdict = getActionVerdict(c.consensus, c.tensionSpread, c.topBull.full);
  const now = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  // Top 3 bulls, bottom 2 bears
  const bulls = c.scores.slice(0, 3);
  const bears = c.scores.slice(-2).reverse();
  const midRishis = c.scores.slice(3, c.scores.length - 2);

  const sectionLabel: React.CSSProperties = {
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: 2,
    color: '#475569',
    marginBottom: 8,
    textTransform: 'uppercase' as const,
  };

  const card: React.CSSProperties = {
    padding: '14px 16px',
    background: 'rgba(15,23,42,0.6)',
    borderRadius: 8,
    marginBottom: 10,
  };

  return (
    <div style={{ background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(212,175,55,0.25)', borderRadius: 10, overflow: 'hidden' }}>

      {/* ── Header bar ── */}
      <div style={{ padding: '14px 18px', background: 'rgba(212,175,55,0.06)', borderBottom: '1px solid rgba(212,175,55,0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 10, color: '#D4AF37', letterSpacing: 2, fontWeight: 700, marginBottom: 4 }}>🔮 RISHI CATALYST ENGINE</div>
          <div style={{ fontSize: 15, fontWeight: 900, color: '#F1F5F9', lineHeight: 1.3 }}>{title}</div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ padding: '6px 12px', background: `${prob.color}18`, border: `1px solid ${prob.color}50`, borderRadius: 6 }}>
            <div style={{ fontSize: 9, color: prob.color, letterSpacing: 1, marginBottom: 2 }}>COUNCIL CONSENSUS</div>
            <div style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 18, color: prob.color }}>{prob.pct}%</div>
            <div style={{ fontSize: 9, color: prob.color }}>{prob.label}</div>
          </div>
          <div style={{ padding: '6px 12px', background: `${timeline.color}18`, border: `1px solid ${timeline.color}50`, borderRadius: 6 }}>
            <div style={{ fontSize: 9, color: timeline.color, letterSpacing: 1, marginBottom: 2 }}>EXPECTED HORIZON</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: timeline.color }}>{timeline.short}</div>
          </div>
        </div>
      </div>

      <div style={{ padding: '18px 18px' }}>

        {/* ── Bull Perspectives ── */}
        <div style={{ marginBottom: 20 }}>
          <div style={sectionLabel}>📈 Bull Perspectives — Top Council Members</div>
          {bulls.map((r, idx) => {
            const topComp = (r.comps || []).slice().sort((a, b) => b.wt - a.wt)[0];
            const convLabel = getRishiConvictionLabel(r.score);
            const impact = getImpactOnValuation(r.score);
            return (
              <div key={r.full} style={{ ...card, border: '1px solid rgba(34,197,94,0.2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ fontSize: 16 }}>{idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}</div>
                    <div>
                      <div style={{ fontWeight: 800, color: '#F1F5F9', fontSize: 13 }}>{r.full}</div>
                      <div style={{ fontSize: 10, color: '#64748B', marginTop: 1 }}>{r.label}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 18, color: scoreColor(r.score) }}>{r.score}</div>
                    <div style={{ fontSize: 9, color: '#64748B' }}>/ 100</div>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: '#CBD5E1', lineHeight: 1.6, marginBottom: 10, padding: '8px 12px', background: 'rgba(30,41,59,0.5)', borderRadius: 6, borderLeft: '2px solid rgba(34,197,94,0.4)' }}>
                  {r.insight}
                </div>
                <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: 9, color: '#475569', letterSpacing: 1 }}>CONVICTION</div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: scoreColor(r.score) }}>{convLabel}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 9, color: '#475569', letterSpacing: 1 }}>IMPACT ON VALUATION</div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#D4AF37' }}>{impact}</div>
                  </div>
                  {topComp && (
                    <div>
                      <div style={{ fontSize: 9, color: '#475569', letterSpacing: 1 }}>KEY METRIC</div>
                      <div style={{ fontSize: 11, color: '#94A3B8', fontFamily: 'monospace' }}>{topComp.label} — {topComp.detail}</div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Additional Rishis toggle */}
          {midRishis.length > 0 && (
            <div>
              <button
                onClick={() => setShowAllRishis(!showAllRishis)}
                style={{ background: 'none', border: '1px solid rgba(30,41,59,0.8)', borderRadius: 6, color: '#64748B', cursor: 'pointer', fontSize: 11, padding: '6px 12px', marginBottom: showAllRishis ? 8 : 0 }}
              >
                {showAllRishis ? '▲ Hide' : `▼ Show ${midRishis.length} more Rishi views`}
              </button>
              {showAllRishis && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 8, marginTop: 8 }}>
                  {midRishis.map(r => (
                    <div key={r.full} style={{ padding: '10px 12px', background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(30,41,59,0.6)', borderRadius: 6 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8' }}>{r.full}</div>
                        <div style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 12, color: scoreColor(r.score) }}>{r.score}</div>
                      </div>
                      <div style={{ fontSize: 10, color: '#64748B', lineHeight: 1.5 }}>{r.insight}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Catalyst Types + Probability Matrix ── */}
        <div style={{ marginBottom: 20 }}>
          <div style={sectionLabel}>⚡ Catalyst Types & Probability Matrix</div>
          <div style={{ border: '1px solid rgba(30,41,59,0.6)', borderRadius: 8, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: 'rgba(30,41,59,0.6)' }}>
                  <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 9, color: '#475569', letterSpacing: 1, fontWeight: 700 }}>CATALYST</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center', fontSize: 9, color: '#475569', letterSpacing: 1, fontWeight: 700 }}>STRENGTH</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center', fontSize: 9, color: '#475569', letterSpacing: 1, fontWeight: 700 }}>PROBABILITY</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center', fontSize: 9, color: '#475569', letterSpacing: 1, fontWeight: 700 }}>PRICE IMPACT</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center', fontSize: 9, color: '#475569', letterSpacing: 1, fontWeight: 700 }}>HORIZON</th>
                </tr>
              </thead>
              <tbody>
                {catalystTypes.map((ct, idx) => {
                  const strColor = ct.strength === 'High' ? '#22C55E' : ct.strength === 'Medium' ? '#D4AF37' : '#EF4444';
                  return (
                    <tr key={idx} style={{ borderTop: '1px solid rgba(30,41,59,0.4)', background: idx % 2 === 0 ? 'transparent' : 'rgba(30,41,59,0.2)' }}>
                      <td style={{ padding: '10px 12px', color: '#CBD5E1', fontWeight: 600 }}>{ct.label}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <span style={{ padding: '2px 8px', background: `${strColor}18`, border: `1px solid ${strColor}40`, borderRadius: 4, fontSize: 10, color: strColor, fontWeight: 700 }}>
                          {ct.strength}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center', fontFamily: 'monospace', fontWeight: 800, color: scoreColor(ct.prob) }}>{ct.prob}%</td>
                      <td style={{ padding: '10px 12px', textAlign: 'center', color: '#22C55E', fontFamily: 'monospace', fontWeight: 700 }}>{ct.impact}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'center', color: '#64748B', fontSize: 11 }}>{ct.horizon}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Bear Risks ── */}
        <div style={{ marginBottom: 20 }}>
          <div style={sectionLabel}>⚠️ Risks & Counter-Catalysts</div>
          {bears.map(r => {
            const keyRisk = (r.comps || []).slice().sort((a, b) => a.v - b.v)[0];
            return (
              <div key={r.full} style={{ ...card, border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.04)', marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6, gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ fontSize: 14 }}>⚠️</div>
                    <div>
                      <div style={{ fontWeight: 700, color: '#FCA5A5', fontSize: 12 }}>{r.full}</div>
                      <div style={{ fontSize: 10, color: '#64748B' }}>{r.label}</div>
                    </div>
                  </div>
                  <div style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 16, color: '#EF4444' }}>{r.score}</div>
                </div>
                <div style={{ fontSize: 11, color: '#94A3B8', lineHeight: 1.6, padding: '8px 12px', background: 'rgba(239,68,68,0.06)', borderRadius: 6, borderLeft: '2px solid rgba(239,68,68,0.4)', marginBottom: 6 }}>
                  {r.insight}
                </div>
                {keyRisk && (
                  <div style={{ fontSize: 10, color: '#64748B' }}>
                    <span style={{ color: '#EF4444', fontWeight: 700 }}>Key Risk: </span>
                    {keyRisk.label} — {keyRisk.detail}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Action Verdict ── */}
        <div style={{ marginBottom: 20 }}>
          <div style={sectionLabel}>🏛️ Rishi Council Verdict</div>
          <div style={{ padding: '16px 18px', background: `${verdict.color}0F`, border: `1px solid ${verdict.color}40`, borderRadius: 8 }}>
            <div style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 15, color: verdict.color, marginBottom: 8, letterSpacing: 0.5 }}>
              {verdict.text}
            </div>
            <div style={{ fontSize: 12, color: '#94A3B8', lineHeight: 1.6 }}>
              {verdict.detail}
            </div>
          </div>
        </div>

        {/* ── Source Transparency ── */}
        <div style={{ padding: '10px 14px', background: 'rgba(30,41,59,0.4)', borderRadius: 6, border: '1px solid rgba(30,41,59,0.6)' }}>
          <div style={{ fontSize: 10, color: '#475569', lineHeight: 1.6 }}>
            <span style={{ color: '#64748B', fontWeight: 600 }}>Source:</span> Rishi Scoring Engine v1 — based on quarterly financial data (P/E, ROCE, FCF, D/E, Revenue CAGR, OPM, Promoter holding). All outputs are algorithmic interpretations, not investment advice.
            <span style={{ marginLeft: 12, color: '#334155' }}>Updated: {now}</span>
          </div>
        </div>

      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENT: Upcoming Catalysts Dashboard
// ─────────────────────────────────────────────────────────────────────────────

function UpcomingCatalystsDashboard({ enriched }: { enriched: Array<{ symbol: string; stock: { name: string } | undefined; score: number; consensus: ConsensusResult | null; combinedConviction: number }> }) {
  const items = enriched
    .filter(i => i.consensus !== null)
    .map(i => {
      const c = i.consensus!;
      const tl = getTimeline(c.topBull.full);
      const prob = getConsensusProb(c.tensionSpread);
      const isNearTerm = tl.short.startsWith('0') || tl.short.startsWith('3');
      return { symbol: i.symbol, name: i.stock?.name ?? '—', score: i.score, conviction: i.combinedConviction, timeline: tl.short, timelineColor: tl.color, prob: prob.pct, probColor: prob.color, title: getCatalystTitle(c) };
    })
    .sort((a, b) => b.conviction - a.conviction || b.score - a.score);

  if (items.length === 0) return null;

  return (
    <div style={{ marginBottom: 24, padding: '16px 18px', background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 900, color: '#D4AF37', letterSpacing: 2 }}>📅 UPCOMING CATALYSTS DASHBOARD</div>
        <div style={{ fontSize: 10, color: '#475569' }}>— sorted by conviction</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
        {items.map(i => (
          <div key={i.symbol} style={{ padding: '12px 14px', background: 'rgba(30,41,59,0.5)', border: '1px solid rgba(30,41,59,0.8)', borderRadius: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
              <div>
                <div style={{ fontFamily: 'monospace', fontWeight: 800, color: '#D4AF37', fontSize: 13 }}>{i.symbol}</div>
                <div style={{ fontSize: 10, color: '#475569', marginTop: 1 }}>{i.name}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 15, color: scoreColor(i.score) }}>{i.score}</div>
                <div style={{ fontSize: 9, color: '#475569' }}>Rishi Score</div>
              </div>
            </div>
            <div style={{ fontSize: 10, color: '#94A3B8', lineHeight: 1.5, marginBottom: 8 }}>{i.title}</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <div style={{ padding: '3px 8px', background: `${i.timelineColor}18`, border: `1px solid ${i.timelineColor}40`, borderRadius: 4, fontSize: 9, color: i.timelineColor, fontWeight: 700 }}>
                {i.timeline}
              </div>
              <div style={{ padding: '3px 8px', background: `${i.probColor}18`, border: `1px solid ${i.probColor}40`, borderRadius: 4, fontSize: 9, color: i.probColor, fontWeight: 700 }}>
                {i.prob}% consensus
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function WatchlistTab() {
  const { t } = useLanguage();
  const [lists, setLists] = useState<Record<string, WatchlistItem[]>>({
    default: [],
    highConviction: [],
    valueTraps: [],
    earningsWatch: [],
  });
  const [activeList, setActiveList] = useState('default');
  const [addSymbol, setAddSymbol] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [error, setError] = useState('');
  const [sortBy, setSortBy] = useState<'added' | 'score' | 'change' | 'conviction'>('added');
  const [expandedSymbol, setExpandedSymbol] = useState<string | null>(null);
  const [catalystFilter, setCatalystFilter] = useState<CatalystFilter>({ highConviction: false, nearTerm: false, earningsSeason: false });
  const [promoteDialog, setPromoteDialog] = useState<PromoteDialog | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setLists(parsed.lists ?? { default: [], highConviction: [], valueTraps: [], earningsWatch: [] });
        setActiveList(parsed.activeList ?? 'default');
      } else {
        const oldRaw = localStorage.getItem('rishi_watchlist_v2');
        if (oldRaw) {
          const old = JSON.parse(oldRaw);
          setLists({ default: Array.isArray(old) ? old : [], highConviction: [], valueTraps: [], earningsWatch: [] });
        }
      }
    } catch {
      setLists({ default: [], highConviction: [], valueTraps: [], earningsWatch: [] });
    }
  }, []);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  function persist(updatedLists: Record<string, WatchlistItem[]>) {
    setLists(updatedLists);
    if (typeof window === 'undefined') return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ lists: updatedLists, activeList })); } catch {}
  }

  const isSmart = activeList === 'smartHighScore';

  const items: WatchlistItem[] = useMemo(() => {
    if (isSmart) {
      return Object.keys(STOCKS)
        .filter(sym => { const s = STOCKS[sym]; return s ? buildConsensus(s).consensus > 75 : false; })
        .map(sym => ({ symbol: sym, addedDate: '', notes: '', conviction: 0 }));
    }
    return lists[activeList] ?? [];
  }, [isSmart, lists, activeList]);

  const symbols = useMemo(() => items.map(i => i.symbol), [items]);
  const { prices, loading } = useLivePrices(symbols);

  const enriched = useMemo(() => {
    return items.map(i => {
      const stock = STOCKS[i.symbol];
      const live = prices[i.symbol]?.price ?? (stock?.price ?? 0);
      const changePct = prices[i.symbol]?.changePercent24h ?? 0;
      const consensus = stock ? buildConsensus(stock) : null;
      const score = consensus?.consensus ?? 0;
      const topBull = consensus?.topBull?.full ?? '—';
      const rishiConviction = score >= 75 ? 9 : score >= 65 ? 7 : score >= 55 ? 5 : score >= 45 ? 3 : 1;
      const userConviction = i.conviction ?? 5;
      const combinedConviction = Math.round((rishiConviction + userConviction) / 2);
      return { ...i, stock, live, changePct, score, topBull, rishiConviction, userConviction, combinedConviction, consensus };
    });
  }, [items, prices]);

  const sorted = useMemo(() => {
    let arr = [...enriched];
    // Apply catalyst filters
    if (catalystFilter.highConviction) arr = arr.filter(i => i.combinedConviction >= 7);
    if (catalystFilter.nearTerm) arr = arr.filter(i => {
      if (!i.consensus) return false;
      const tl = getTimeline(i.consensus.topBull.full);
      return tl.short.includes('0–3') || tl.short.includes('Near');
    });
    if (sortBy === 'added') arr.sort((a, b) => (b.addedDate || '').localeCompare(a.addedDate || ''));
    else if (sortBy === 'score') arr.sort((a, b) => b.score - a.score);
    else if (sortBy === 'conviction') arr.sort((a, b) => b.combinedConviction - a.combinedConviction);
    else arr.sort((a, b) => b.changePct - a.changePct);
    return arr;
  }, [enriched, sortBy, catalystFilter]);

  

  function addItem() {
    setError('');
    const sym = addSymbol.trim().toUpperCase();
    if (!sym) { setError('Enter a symbol'); return; }
    if (!STOCKS[sym]) { setError('Symbol not in database'); return; }
    if (items.some(x => x.symbol === sym)) { setError('Already in watchlist'); return; }
    const next = { ...lists, [activeList]: [{ symbol: sym, addedDate: new Date().toISOString(), conviction: 5, notes: '' }, ...items] };
    persist(next);
    setSearchQuery(''); setAddSymbol(''); setShowDropdown(false);
  }

  function removeItem(symbol: string) {
    persist({ ...lists, [activeList]: items.filter(i => i.symbol !== symbol) });
  }

  function updateField(symbol: string, field: keyof WatchlistItem, value: string | number) {
    persist({ ...lists, [activeList]: items.map(i => i.symbol === symbol ? { ...i, [field]: value } : i) });
  }

  function openPromoteDialog(symbol: string) {
    const stock = STOCKS[symbol];
    if (!stock) return;
    const live = prices[symbol]?.price ?? stock.price;
    const avgPrice = live > 0 ? live : stock.price;
    const suggestedShares = avgPrice > 0 ? Math.max(1, Math.round(10000 / avgPrice)) : 1;
    setPromoteDialog({ symbol, avgPrice, suggestedShares, shares: suggestedShares, keepInWatchlist: false });
  }

  function confirmPromote() {
    if (!promoteDialog) return;
    const { symbol, avgPrice, shares, keepInWatchlist } = promoteDialog;
    const finalShares = Math.max(1, shares);
    addHolding({ symbol, shares: finalShares, avgPrice, addedDate: new Date().toISOString() });
    if (!keepInWatchlist && !isSmart) removeItem(symbol);
    setPromoteDialog(null);
    showToast(`✅ Added ${finalShares} shares of ${symbol} to Holdings at ${avgPrice.toLocaleString('en-IN')}`);
  }

  const inputStyle: React.CSSProperties = {
    padding: '8px 12px', background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(212,175,55,0.3)',
    borderRadius: 6, color: '#E2E8F0', fontSize: 13, fontFamily: 'monospace', width: '100%',
  };

  const btnGold: React.CSSProperties = {
    padding: '8px 16px', background: 'rgba(212,175,55,0.15)', border: '1px solid rgba(212,175,55,0.4)',
    borderRadius: 6, color: '#D4AF37', fontSize: 12, fontFamily: 'monospace', cursor: 'pointer',
    letterSpacing: 1, whiteSpace: 'nowrap',
  };

  const listConfigs = [
    { id: 'default', label: 'Default', icon: '★', smart: false },
    { id: 'highConviction', label: 'High Conviction', icon: '🔥', smart: false },
    { id: 'valueTraps', label: 'Value Traps', icon: '⚠️', smart: false },
    { id: 'earningsWatch', label: 'Earnings Watch', icon: '📊', smart: false },
    { id: 'smartHighScore', label: 'Smart: Score > 75', icon: '⚡', smart: true },
  ];

  return (
    <div style={{ position: 'relative' }}>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: 24, right: 24, zIndex: 9999, padding: '14px 20px', background: 'rgba(15,23,42,0.97)', border: '1px solid rgba(34,197,94,0.4)', borderRadius: 10, color: '#22C55E', fontSize: 13, fontFamily: 'monospace', boxShadow: '0 4px 24px rgba(0,0,0,0.4)', maxWidth: 400 }}>
          {toast}
        </div>
      )}

      {/* Promote Dialog */}
      {promoteDialog && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9998, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setPromoteDialog(null)}>
          <div style={{ background: '#0F172A', border: '1px solid rgba(212,175,55,0.4)', borderRadius: 12, padding: 28, minWidth: 360, maxWidth: 440 }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 900, color: '#D4AF37', marginBottom: 4, fontFamily: 'monospace' }}>{t("lab.promoteDialog.promote")} {promoteDialog.symbol} → {t("lab.promoteDialog.holdings")}</div>
            <div style={{ fontSize: 11, color: '#64748B', marginBottom: 20 }}>{STOCKS[promoteDialog.symbol]?.name ?? ''}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              <div style={{ padding: 12, background: 'rgba(30,41,59,0.6)', borderRadius: 8 }}>
                <div style={{ fontSize: 10, color: '#64748B', marginBottom: 4 }}>LTP</div>
                <div style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 18, color: '#E2E8F0' }}>{promoteDialog.avgPrice.toLocaleString('en-IN')}</div>
              </div>
              <div style={{ padding: 12, background: 'rgba(30,41,59,0.6)', borderRadius: 8 }}>
                <div style={{ fontSize: 10, color: '#64748B', marginBottom: 4 }}>TOTAL</div>
                <div style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 18, color: '#D4AF37' }}>{(promoteDialog.shares * promoteDialog.avgPrice).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, color: '#64748B', marginBottom: 6, letterSpacing: 1 }}>{t("lab.promoteDialog.shares")} ({t("lab.promoteDialog.suggested")}: {promoteDialog.suggestedShares} ≈ 10,000)</div>
              <input type="number" min={1} value={promoteDialog.shares} onChange={e => setPromoteDialog({ ...promoteDialog, shares: Math.max(1, Number(e.target.value)) })} style={{ ...inputStyle, fontSize: 18, fontWeight: 900, textAlign: 'center' }} />
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
              {[5000, 10000, 25000, 50000, 100000].map(amt => {
                const qty = Math.max(1, Math.round(amt / promoteDialog.avgPrice));
                return (
                  <button key={amt} onClick={() => setPromoteDialog({ ...promoteDialog, shares: qty })} style={{ padding: '6px 10px', background: 'rgba(30,41,59,0.6)', border: '1px solid rgba(30,41,59,0.8)', borderRadius: 6, color: '#94A3B8', fontSize: 11, cursor: 'pointer', fontFamily: 'monospace' }}>
                    {amt >= 100000 ? '1L' : `${amt / 1000}k`} ({qty}sh)
                  </button>
                );
              })}
            </div>
            {!isSmart && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <input type="checkbox" id="keepInWl" checked={promoteDialog.keepInWatchlist} onChange={e => setPromoteDialog({ ...promoteDialog, keepInWatchlist: e.target.checked })} style={{ accentColor: '#D4AF37', width: 16, height: 16 }} />
                <label htmlFor="keepInWl" style={{ fontSize: 12, color: '#94A3B8', cursor: 'pointer' }}>{t("lab.promoteDialog.keepInWatchlist")}</label>
              </div>
            )}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={confirmPromote} style={{ ...btnGold, flex: 1, padding: '12px 16px', fontSize: 13, fontWeight: 900, letterSpacing: 2 }}>{t("lab.promoteDialog.confirm")}</button>
              <button onClick={() => setPromoteDialog(null)} style={{ padding: '12px 16px', background: 'transparent', border: '1px solid rgba(30,41,59,0.8)', borderRadius: 6, color: '#64748B', fontSize: 12, cursor: 'pointer' }}>{t("lab.promoteDialog.cancel")}</button>
            </div>
          </div>
        </div>
      )}

      {/* List Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: '1px solid rgba(30,41,59,0.8)', paddingBottom: 10, flexWrap: 'wrap' }}>
        {listConfigs.map(cfg => (
          <button key={cfg.id} onClick={() => setActiveList(cfg.id)} style={{ padding: '8px 14px', background: activeList === cfg.id ? 'rgba(212,175,55,0.15)' : 'transparent', border: activeList === cfg.id ? '1px solid rgba(212,175,55,0.4)' : '1px solid rgba(30,41,59,0.8)', borderRadius: 6, color: activeList === cfg.id ? '#D4AF37' : '#64748B', fontSize: 12, cursor: 'pointer', fontWeight: activeList === cfg.id ? 700 : 400 }}>
            {cfg.icon} {cfg.label} ({cfg.smart ? items.length : (lists[cfg.id] ?? []).length})
          </button>
        ))}
      </div>

      {/* Smart list banner */}
      {isSmart && (
        <div style={{ padding: '10px 16px', marginBottom: 16, background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 8, fontSize: 12, color: '#22C55E' }}>
 {t("lab.smartList.autoGenerated")}
        </div>
      )}

      {/* Upcoming Catalysts Dashboard */}
      {enriched.length > 0 && <UpcomingCatalystsDashboard enriched={enriched} />}

      {/* Smart Catalyst Filters */}
      {enriched.length > 0 && !isSmart && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ fontSize: 10, color: '#475569', letterSpacing: 1 }}>FILTERS:</div>
          {[
            { key: 'highConviction', label: '🔥 High Conviction Only' },
            { key: 'nearTerm', label: '⚡ Near-term (0–3M)' },
          ].map(f => {
            const active = catalystFilter[f.key as keyof CatalystFilter];
            return (
              <button key={f.key} onClick={() => setCatalystFilter(prev => ({ ...prev, [f.key]: !prev[f.key as keyof CatalystFilter] }))} style={{ padding: '5px 12px', background: active ? 'rgba(212,175,55,0.15)' : 'transparent', border: active ? '1px solid rgba(212,175,55,0.5)' : '1px solid rgba(30,41,59,0.8)', borderRadius: 6, color: active ? '#D4AF37' : '#64748B', fontSize: 11, cursor: 'pointer' }}>
                {f.label}
              </button>
            );
          })}
          {(catalystFilter.highConviction || catalystFilter.nearTerm) && (
            <button onClick={() => setCatalystFilter({ highConviction: false, nearTerm: false, earningsSeason: false })} style={{ padding: '5px 12px', background: 'transparent', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, color: '#EF4444', fontSize: 11, cursor: 'pointer' }}>
              ✕ Clear
            </button>
          )}
        </div>
      )}

      {/* Add + Sort controls */}
      {!isSmart && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
          <div style={{ flex: '1 1 320px' }}>
            <div style={{ fontSize: 10, color: '#64748B', marginBottom: 6, letterSpacing: 1 }}>ADD SYMBOL (type to search)</div>
            <div style={{ position: 'relative' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10 }}>
                <div style={{ position: 'relative' }}>
                  <input
                    value={searchQuery}
                    onChange={e => { const v = e.target.value.toUpperCase(); setSearchQuery(v); setShowDropdown(v.trim().length > 0); setAddSymbol(v); }}
                    onKeyDown={e => { if (e.key === 'Enter') addItem(); if (e.key === 'Escape') setShowDropdown(false); }}
                    onFocus={() => searchQuery.trim().length > 0 && setShowDropdown(true)}
                    onBlur={() => setTimeout(() => setShowDropdown(false), 180)}
                    placeholder="Type symbol / name / sector…"
                    style={inputStyle}
                  />
                  {showDropdown && searchQuery.trim().length > 0 && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, maxHeight: 280, overflowY: 'auto', background: 'rgba(15,23,42,0.98)', border: '1px solid rgba(212,175,55,0.4)', borderRadius: 6, zIndex: 1000, boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
                      {Object.keys(STOCKS).filter(sym => { const s = STOCKS[sym]; const q = searchQuery.toLowerCase(); return sym.toLowerCase().includes(q) || s.name.toLowerCase().includes(q) || s.sector.toLowerCase().includes(q); }).slice(0, 20).map(sym => {
                        const stock = STOCKS[sym];
                        const alreadyAdded = items.some(x => x.symbol === sym);
                        return (
                          <div key={sym}
                            onClick={() => { if (alreadyAdded) return; const next = { ...lists, [activeList]: [{ symbol: sym, addedDate: new Date().toISOString(), conviction: 5, notes: '' }, ...items] }; persist(next); setSearchQuery(''); setAddSymbol(''); setShowDropdown(false); showToast(`✅ Added ${sym} to watchlist`); }}
                            style={{ padding: '10px 12px', cursor: alreadyAdded ? 'not-allowed' : 'pointer', background: 'transparent', borderBottom: '1px solid rgba(30,41,59,0.4)', opacity: alreadyAdded ? 0.45 : 1 }}
                            onMouseEnter={e => !alreadyAdded && (e.currentTarget.style.background = 'rgba(212,175,55,0.10)')}
                            onMouseLeave={e => !alreadyAdded && (e.currentTarget.style.background = 'transparent')}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div>
                                <div style={{ fontFamily: 'monospace', fontWeight: 800, color: alreadyAdded ? '#64748B' : '#D4AF37', fontSize: 13 }}>{sym}</div>
                                <div style={{ fontSize: 10, color: '#64748B', marginTop: 2 }}>{stock.name} · {stock.sector}</div>
                              </div>
                              {alreadyAdded && <div style={{ fontSize: 10, color: '#64748B' }}>Already added</div>}
                            </div>
                          </div>
                        );
                      })}
                      {Object.keys(STOCKS).filter(sym => { const s = STOCKS[sym]; const q = searchQuery.toLowerCase(); return sym.toLowerCase().includes(q) || s.name.toLowerCase().includes(q) || s.sector.toLowerCase().includes(q); }).length === 0 && (
                        <div style={{ padding: '20px 12px', textAlign: 'center', color: '#64748B', fontSize: 12 }}>No stocks found matching "{searchQuery}"</div>
                      )}
                    </div>
                  )}
                </div>
                <button onClick={addItem} style={btnGold}>+ Add</button>
              </div>
            </div>
            {error && <div style={{ marginTop: 8, fontSize: 12, color: '#EF4444' }}>{error}</div>}
          </div>
          <div style={{ minWidth: 220 }}>
            <div style={{ fontSize: 10, color: '#64748B', marginBottom: 6, letterSpacing: 1 }}>SORT</div>
            <select value={sortBy} onChange={e => setSortBy(e.target.value as 'added' | 'score' | 'change' | 'conviction')} style={inputStyle}>
              <option value="added">{t("lab.sort.recentlyAdded")}</option>
              <option value="score">{t("lab.sort.rishiScore")}</option>
              <option value="conviction">{t("lab.sort.convictionLevel")}</option>
              <option value="change">{t("lab.sort.change24h")}</option>
            </select>
          </div>
          <div style={{ fontSize: 12, color: '#64748B' }}>{loading ? 'Fetching prices…' : `${items.length} item${items.length !== 1 ? 's' : ''}`}</div>
        </div>
      )}

      {/* Smart sort */}
      {isSmart && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
          <div style={{ fontSize: 10, color: '#64748B', letterSpacing: 1 }}>SORT</div>
          <select value={sortBy} onChange={e => setSortBy(e.target.value as 'added' | 'score' | 'change' | 'conviction')} style={{ ...inputStyle, width: 200 }}>
            <option value="score">{t("lab.sort.rishiScore")}</option>
            <option value="change">{t("lab.sort.change24h")}</option>
          </select>
          <div style={{ fontSize: 12, color: '#64748B' }}>{loading ? 'Fetching…' : `${items.length} stocks`}</div>
        </div>
      )}

      {items.length === 0 && !isSmart && (
        <div style={{ padding: 48, textAlign: 'center', border: '1px dashed rgba(212,175,55,0.2)', borderRadius: 8 }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>★</div>
          <div style={{ color: '#64748B', marginBottom: 8 }}>Your watchlist is empty.</div>
          <div style={{ fontSize: 12, color: '#475569' }}>Type a symbol above to add your first idea.</div>
        </div>
      )}

      {/* Stock Table */}
      {items.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(30,41,59,0.8)' }}>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 9, color: '#475569', letterSpacing: 1, fontWeight: 700 }}>STOCK</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 9, color: '#475569', letterSpacing: 1, fontWeight: 700 }}>PRICE</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 9, color: '#475569', letterSpacing: 1, fontWeight: 700 }}>24H %</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 9, color: '#475569', letterSpacing: 1, fontWeight: 700 }}>{t("lab.scoreHeader")}</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 9, color: '#475569', letterSpacing: 1, fontWeight: 700 }}>CONVICTION</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 9, color: '#475569', letterSpacing: 1, fontWeight: 700 }}>TOP BULL</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 9, color: '#475569', letterSpacing: 1, fontWeight: 700 }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(i => {
                const isExpanded = expandedSymbol === i.symbol;
                return (
                  <Fragment key={i.symbol}>
                    <tr style={{ borderBottom: isExpanded ? 'none' : '1px solid rgba(30,41,59,0.4)', background: isExpanded ? 'rgba(212,175,55,0.04)' : 'transparent' }}>
                      <td style={{ padding: '12px 12px' }}>
                        <Link href={`/stock/${i.symbol}`} style={{ color: '#D4AF37', textDecoration: 'none', fontWeight: 800, fontFamily: 'monospace', fontSize: 13 }}>{i.symbol}</Link>
                        <div style={{ fontSize: 10, color: '#475569', marginTop: 2 }}>{i.stock?.name ?? '—'}</div>
                      </td>
                      <td style={{ padding: '12px 12px', fontFamily: 'monospace', color: '#E2E8F0', fontWeight: 700 }}>{(i.live ?? 0).toLocaleString('en-IN')}</td>
                      <td style={{ padding: '12px 12px', fontFamily: 'monospace', color: changeColor(i.changePct ?? 0), fontWeight: 700 }}>
                        {(i.changePct ?? 0) >= 0 ? '+' : ''}{(i.changePct ?? 0).toFixed(2)}%
                      </td>
                      <td style={{ padding: '12px 12px' }}>
                        <div style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 16, color: scoreColor(i.score) }}>{i.score}</div>
                        <div style={{ fontSize: 9, color: '#475569', marginTop: 1 }}>{i.consensus?.category ?? '—'}</div>
                      </td>
                      <td style={{ padding: '12px 12px', minWidth: 160 }}>
                        {!isSmart ? (
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                              <input type="range" min={1} max={10} value={i.userConviction} onChange={e => updateField(i.symbol, 'conviction', Number(e.target.value))} style={{ flex: 1, accentColor: convictionColor(i.combinedConviction) }} />
                              <span style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 14, color: convictionColor(i.combinedConviction), minWidth: 18 }}>{i.combinedConviction}</span>
                            </div>
                            <div style={{ fontSize: 9, color: convictionColor(i.combinedConviction) }}>
                              {convictionLabel(i.combinedConviction)} · You: {i.userConviction} · Rishi: {i.rishiConviction}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 14, color: convictionColor(i.rishiConviction) }}>{i.rishiConviction}/10</div>
                            <div style={{ fontSize: 9, color: convictionColor(i.rishiConviction), marginTop: 2 }}>{convictionLabel(i.rishiConviction)}</div>
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '12px 12px', fontSize: 11, color: '#22C55E', fontWeight: 700 }}>{i.topBull}</td>
                      <td style={{ padding: '12px 12px' }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <button onClick={() => openPromoteDialog(i.symbol)} style={btnGold}>{t("lab.promoteButton")}</button>
                          {!isSmart && (
                            <>
                              <button onClick={() => setExpandedSymbol(isExpanded ? null : i.symbol)} style={{ background: isExpanded ? 'rgba(212,175,55,0.12)' : 'none', border: '1px solid rgba(30,41,59,0.8)', borderRadius: 4, color: isExpanded ? '#D4AF37' : '#64748B', cursor: 'pointer', fontSize: 11, padding: '4px 8px' }}>
                                {isExpanded ? '▲ Hide' : '▼ Analysis'}
                              </button>
                              <button onClick={() => removeItem(i.symbol)} style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', fontSize: 14 }} title={t("lab.remove")}>✕</button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Expanded: Thesis + Catalyst Engine */}
                    {!isSmart && isExpanded && (
                      <tr key={`${i.symbol}-detail`} style={{ borderBottom: '1px solid rgba(30,41,59,0.4)' }}>
                        <td colSpan={7} style={{ padding: '20px 16px 24px', background: 'rgba(15,23,42,0.3)' }}>

                          {/* Investment Thesis */}
                          <div style={{ marginBottom: 20 }}>
                            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, color: '#475569', marginBottom: 8 }}>INVESTMENT THESIS</div>
                            <textarea
                              value={i.notes ?? ''}
                              onChange={e => updateField(i.symbol, 'notes', e.target.value)}
                              placeholder="Write your thesis — why you like this idea, key risks, timeline, target price…"
                              rows={3}
                              style={{ width: '100%', padding: '10px 12px', background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 6, color: '#E2E8F0', fontSize: 12, fontFamily: 'monospace', resize: 'vertical', lineHeight: 1.6 }}
                            />
                          </div>

                          {/* Rishi Catalyst Engine */}
                          {i.consensus && <CatalystEngine c={i.consensus} />}

                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
          <div style={{ marginTop: 10, fontSize: 11, color: '#475569' }}>
            {isSmart ? t("lab.smartList.description") : t("lab.conviction.description")}
          </div>
        </div>
      )}
    </div>
  );
}
