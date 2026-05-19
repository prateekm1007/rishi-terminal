'use client';

import { useState } from 'react';
import Link from 'next/link';
import { STOCKS } from '../../data/stocks';
import { scoreJhunjhunwala, scoreDamani, scoreBuffett, scoreGraham, scoreLynch, scoreKacholia, scoreKedia, scoreMunger, scoreGreenblatt, scorePabrai, scorePorinju, scoreRaamdeo, scoreNemish, scoreBasant, scorePhilipFisher, scoreHowardMarks, scoreSethKlarman, scoreJohnTempleton, scoreWalterSchloss } from '../../lib/scorers';
import { sc, getSig, SIG } from '../../lib/utils';

interface RishiMessage {
  name: string;
  emoji: string;
  verdict: string;
  reasoning: string;
  isLoading?: boolean;
}

const RISHIS_DATA = [
  { name: 'Rakesh Jhunjhunwala', emoji: '≡ƒªü' },
  { name: 'Radhakishan Damani', emoji: '≡ƒÅ░' },
  { name: 'Warren Buffett', emoji: '≡ƒÄ⌐' },
  { name: 'Charlie Munger', emoji: '≡ƒºá' },
  { name: 'Peter Lynch', emoji: '≡ƒôè' },
];

const SCORERS = [scoreJhunjhunwala, scoreDamani, scoreBuffett, scoreGraham, scoreLynch, scoreKacholia, scoreKedia, scoreMunger, scoreGreenblatt, scorePabrai, scorePorinju, scoreRaamdeo, scoreNemish, scoreBasant, scorePhilipFisher, scoreHowardMarks, scoreSethKlarman, scoreJohnTempleton, scoreWalterSchloss];

function getScores(sym: string) {
  const s = STOCKS[sym as keyof typeof STOCKS];
  const scores = SCORERS.map(fn => fn(s));
  const composite = Math.round(scores.reduce((a, b) => a + b.score, 0) / scores.length);
  return { scores, composite };
}

// Deep metrics comparison
function getDeepMetrics(symA: string, symB: string) {
  const a = STOCKS[symA as keyof typeof STOCKS];
  const b = STOCKS[symB as keyof typeof STOCKS];

  const metrics = [
    { name: 'P/E Ratio', a: a.pe, b: b.pe, better: a.pe < b.pe ? 'A' : 'B', description: 'Lower is cheaper' },
    { name: 'ROE (%)', a: a.roe, b: b.roe, better: a.roe > b.roe ? 'A' : 'B', description: 'Higher is better' },
    { name: 'Debt/Equity', a: a.de, b: b.de, better: a.de < b.de ? 'A' : 'B', description: 'Lower is safer' },
    { name: 'Revenue CAGR (%)', a: a.revcagr, b: b.revcagr, better: a.revcagr > b.revcagr ? 'A' : 'B', description: 'Higher is better' },
    { name: 'EPS CAGR (%)', a: a.epscagr, b: b.epscagr, better: a.epscagr > b.epscagr ? 'A' : 'B', description: 'Higher is better' },
    { name: 'OPM (%)', a: a.opm, b: b.opm, better: a.opm > b.opm ? 'A' : 'B', description: 'Higher is better' },
    { name: 'Promoter Holding (%)', a: a.promo, b: b.promo, better: a.promo > b.promo ? 'A' : 'B', description: 'Higher is better' },
    { name: 'Market Cap (Cr)', a: a.mktcap, b: b.mktcap, better: 'N/A', description: 'Size comparison' },
  ];

  return metrics;
}

async function getRishiComparison(rishiName: string, symA: string, symB: string, stockA: any, stockB: any) {
  try {
    const systemPrompt = `You are ${rishiName}. You are comparing two stocks: ${symA} (${stockA.name}) vs ${symB} (${stockB.name}).

Stock A (${symA}): PE ${stockA.pe}, ROE ${stockA.roe}%, Debt ${stockA.de}x, Revenue CAGR ${stockA.revcagr}%, Sector ${stockA.sector}
Stock B (${symB}): PE ${stockB.pe}, ROE ${stockB.roe}%, Debt ${stockB.de}x, Revenue CAGR ${stockB.revcagr}%, Sector ${stockB.sector}

Give a SHORT, DIRECT comparison (2-3 sentences max) on which stock YOU would prefer and why, based on YOUR investment philosophy.`;

    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemPrompt,
        history: [],
        message: `Compare ${symA} vs ${symB}. Which do you prefer?`,
      }),
    });

    const data = await res.json();
    return data.text || 'Unable to fetch comparison';
  } catch (err) {
    return 'Error fetching Rishi opinion';
  }
}

export default function Compare() {
  const [symA, setSymA] = useState('TCS');
  const [symB, setSymB] = useState('INFY');
  const [rishiMessages, setRishiMessages] = useState<RishiMessage[]>([]);
  const [loadingRishi, setLoadingRishi] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'verdict' | 'metrics' | 'rishis'>('verdict');

  const stockA = STOCKS[symA as keyof typeof STOCKS];
  const stockB = STOCKS[symB as keyof typeof STOCKS];
  const { scores: scoresA, composite: compA } = getScores(symA);
  const { scores: scoresB, composite: compB } = getScores(symB);

  const SYMBOLS = Object.keys(STOCKS);
  const deepMetrics = getDeepMetrics(symA, symB);

  const fetchAllRishiComparisons = async () => {
    setRishiMessages([]);
    for (const rishi of RISHIS_DATA) {
      setLoadingRishi(rishi.name);
      const opinion = await getRishiComparison(rishi.name, symA, symB, stockA, stockB);
      setRishiMessages(prev => [...prev, {
        name: rishi.name,
        emoji: rishi.emoji,
        verdict: symA, // placeholder
        reasoning: opinion,
      }]);
    }
    setLoadingRishi(null);
  };

  return (
    <div style={{ fontFamily: 'monospace', background: '#050508', color: '#E2E8F0', minHeight: '100vh', padding: 24 }}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600&display=swap"/>

      <Link href="/" style={{ color: '#F59E0B', textDecoration: 'none', fontSize: 12, marginBottom: 20, display: 'inline-block' }}>ΓåÉ Back to Dashboard</Link>

      <div style={{ fontFamily: 'Cinzel, Georgia', fontSize: 20, color: '#F59E0B', letterSpacing: 3, marginBottom: 4 }}>COMPARE STOCKS</div>
      <div style={{ fontSize: 10, color: '#334155', letterSpacing: 2, marginBottom: 24 }}>DEEP ANALYSIS + RISHI PERSPECTIVES</div>

      {/* Stock Selector */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px 1fr', gap: 12, marginBottom: 24, alignItems: 'center' }}>
        <select value={symA} onChange={e => { setSymA(e.target.value); setRishiMessages([]); }} style={{ background: '#09090F', border: '1px solid #1E293B', borderRadius: 6, padding: '10px 14px', color: '#E2E8F0', fontSize: 13, fontFamily: 'inherit' }}>
          {SYMBOLS.map(s => <option key={s} value={s}>{s} ΓÇô {STOCKS[s as keyof typeof STOCKS].name}</option>)}
        </select>
        <div style={{ textAlign: 'center', color: '#F59E0B', fontSize: 16, fontWeight: 700 }}>VS</div>
        <select value={symB} onChange={e => { setSymB(e.target.value); setRishiMessages([]); }} style={{ background: '#09090F', border: '1px solid #1E293B', borderRadius: 6, padding: '10px 14px', color: '#E2E8F0', fontSize: 13, fontFamily: 'inherit' }}>
          {SYMBOLS.map(s => <option key={s} value={s}>{s} ΓÇô {STOCKS[s as keyof typeof STOCKS].name}</option>)}
        </select>
      </div>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 24, borderBottom: '1px solid #1E293B' }}>
        {[
          { id: 'verdict' as const, label: 'ΓÜû∩╕Å Verdict' },
          { id: 'metrics' as const, label: '≡ƒôè Deep Metrics' },
          { id: 'rishis' as const, label: '≡ƒºÿ Rishi Perspectives' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '12px 24px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid #F59E0B' : '2px solid transparent',
              color: activeTab === tab.id ? '#F59E0B' : '#64748B',
              fontSize: 12,
              cursor: 'pointer',
              fontWeight: activeTab === tab.id ? 700 : 400,
              transition: 'all 0.2s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* VERDICT TAB */}
      {activeTab === 'verdict' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 24 }}>
            {[
              { sym: symA, stock: stockA, composite: compA, scores: scoresA, color: '#F59E0B' },
              { sym: symB, stock: stockB, composite: compB, scores: scoresB, color: '#818CF8' },
            ].map(({ sym, stock, composite, scores, color }) => (
              <div key={sym} style={{ background: '#09090F', border: `1px solid ${color}30`, borderRadius: 8, padding: 20 }}>
                <div style={{ fontFamily: 'Cinzel, Georgia', fontSize: 16, color: '#F5E6D3', marginBottom: 4 }}>{stock.name}</div>
                <div style={{ fontSize: 10, color: '#475569', marginBottom: 12 }}>{stock.sector} ┬╖ {stock.exchange}</div>
                <div style={{ fontSize: 42, fontWeight: 700, color: sc(composite), marginBottom: 4 }}>{composite}</div>
                <div style={{ fontSize: 10, color: sc(composite), marginBottom: 16 }}>{getSig(composite)} ┬╖ {stock.price.toLocaleString('en-US')}</div>

                {scores.map((s: any) => (
                  <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 10, color: '#64748B', width: 90 }}>{s.name}</span>
                    <div style={{ flex: 1, background: '#1E293B', borderRadius: 2, height: 3 }}>
                      <div style={{ width: s.score + '%', background: sc(s.score), height: '100%', borderRadius: 2 }}></div>
                    </div>
                    <span style={{ fontSize: 11, color: sc(s.score), width: 26, textAlign: 'right', fontWeight: 600 }}>{s.score}</span>
                  </div>
                ))}

                <Link href={`/stock/${sym}`} style={{ display: 'inline-block', marginTop: 12, padding: '6px 12px', borderRadius: 4, background: `${color}15`, border: `1px solid ${color}40`, color: color, fontSize: 10, textDecoration: 'none', fontWeight: 600 }}>Deep Analyze ΓåÆ</Link>
              </div>
            ))}
          </div>

          <div style={{ background: '#09090F', border: '1px solid #1E293B', borderRadius: 8, padding: 18 }}>
            <div style={{ fontSize: 11, color: '#F59E0B', fontWeight: 600, marginBottom: 16, letterSpacing: 1 }}>RISHI VERDICT: WHO WINS?</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
              {scoresA.map((sA: any, i: number) => {
                const sB = scoresB[i];
                const winner = sA.score > sB.score ? symA : sB.score > sA.score ? symB : 'TIE';
                const winColor = winner === symA ? '#F59E0B' : winner === symB ? '#818CF8' : '#475569';
                return (
                  <div key={sA.name} style={{ background: '#0A0A16', borderRadius: 6, padding: 12, borderLeft: `3px solid ${winColor}` }}>
                    <div style={{ fontSize: 10, color: '#94A3B8', marginBottom: 8 }}>{sA.name}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 11, color: symA === winner ? '#F59E0B' : '#64748B' }}>{symA}: {sA.score}</span>
                      <span style={{ fontSize: 11, color: symB === winner ? '#818CF8' : '#64748B' }}>{symB}: {sB.score}</span>
                    </div>
                    <div style={{ fontSize: 10, color: winColor, fontWeight: 600, textAlign: 'center', padding: '4px', background: `${winColor}10`, borderRadius: 3 }}>
                      {winner === 'TIE' ? 'TIED' : `${winner} WINS`}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* METRICS TAB */}
      {activeTab === 'metrics' && (
        <div style={{ background: '#09090F', border: '1px solid #1E293B', borderRadius: 8, padding: 20 }}>
          <div style={{ fontSize: 11, color: '#F59E0B', fontWeight: 600, marginBottom: 16, letterSpacing: 1 }}>DEEP METRIC COMPARISON</div>
          {deepMetrics.map((m, i) => {
            const betterA = m.better === 'A';
            const betterB = m.better === 'B';
            return (
              <div key={i} style={{ marginBottom: 16, paddingBottom: 16, borderBottom: i < deepMetrics.length - 1 ? '1px solid #1E293B' : 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: '#E2E8F0', fontWeight: 600 }}>{m.name}</span>
                  <span style={{ fontSize: 10, color: '#64748B' }}>{m.description}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ background: betterA ? '#0A2612' : '#09090F', border: `1px solid ${betterA ? '#22C55E' : '#1E293B'}`, borderRadius: 6, padding: 12 }}>
                    <div style={{ fontSize: 10, color: '#94A3B8', marginBottom: 4 }}>{symA}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: betterA ? '#22C55E' : '#F59E0B' }}>{typeof m.a === 'number' ? m.a.toFixed(2) : m.a}</div>
                    {betterA && <div style={{ fontSize: 9, color: '#22C55E', marginTop: 4 }}>Γ£ô Better</div>}
                  </div>
                  <div style={{ background: betterB ? '#0A2612' : '#09090F', border: `1px solid ${betterB ? '#22C55E' : '#1E293B'}`, borderRadius: 6, padding: 12 }}>
                    <div style={{ fontSize: 10, color: '#94A3B8', marginBottom: 4 }}>{symB}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: betterB ? '#22C55E' : '#818CF8' }}>{typeof m.b === 'number' ? m.b.toFixed(2) : m.b}</div>
                    {betterB && <div style={{ fontSize: 9, color: '#22C55E', marginTop: 4 }}>Γ£ô Better</div>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* RISHIS TAB */}
      {activeTab === 'rishis' && (
        <div>
          <button
            onClick={fetchAllRishiComparisons}
            disabled={loadingRishi !== null}
            style={{
              padding: '10px 20px',
              background: loadingRishi ? '#475569' : '#F59E0B',
              color: loadingRishi ? '#64748B' : '#000',
              border: 'none',
              borderRadius: 6,
              fontWeight: 700,
              cursor: loadingRishi ? 'not-allowed' : 'pointer',
              marginBottom: 20,
              fontSize: 12,
            }}
          >
            {loadingRishi ? `Loading ${loadingRishi}...` : '≡ƒºÿ Get Rishi Perspectives'}
          </button>

          {rishiMessages.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#64748B', padding: '40px 20px' }}>
              <div style={{ fontSize: 32, marginBottom: 16 }}>≡ƒºÿ</div>
              <p>Click above to fetch personalized comparison from legendary investors</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {rishiMessages.map((msg, i) => (
                <div key={i} style={{ background: '#09090F', border: '1px solid #1E293B', borderRadius: 8, padding: 16, borderLeft: '3px solid #F59E0B' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 24 }}>{msg.emoji}</span>
                    {msg.name}
                  </div>
                  <div style={{ fontSize: 12, color: '#E2E8F0', lineHeight: 1.6, minHeight: 60 }}>
                    {msg.reasoning}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div style={{ marginTop: 24, textAlign: 'center', fontSize: 9, color: '#0F172A', letterSpacing: 1 }}>NOT INVESTMENT ADVICE ┬╖ EDUCATIONAL SIMULATION</div>
    </div>
  );
}