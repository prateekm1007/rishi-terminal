'use client';

import { useState } from 'react';
import Link from 'next/link';
import { STOCKS } from '../../data/stocks';
import { scoreJhunjhunwala, scoreDamani, scoreBuffett, scoreGraham, scoreLynch, scoreKacholia, scoreKedia, scoreMunger, scoreGreenblatt, scorePabrai, scorePorinju, scoreRaamdeo, scoreNemish, scoreBasant, scorePhilipFisher, scoreHowardMarks, scoreSethKlarman, scoreJohnTempleton, scoreWalterSchloss } from '../../lib/scorers';
import { sc, getSig, SIG } from '../../lib/utils';

const SCORERS = [scoreJhunjhunwala, scoreDamani, scoreBuffett, scoreGraham, scoreLynch, scoreKacholia, scoreKedia, scoreMunger, scoreGreenblatt, scorePabrai, scorePorinju, scoreRaamdeo, scoreNemish, scoreBasant, scorePhilipFisher, scoreHowardMarks, scoreSethKlarman, scoreJohnTempleton, scoreWalterSchloss];

function getScores(sym: string) {
  const s = STOCKS[sym as keyof typeof STOCKS];
  const scores = SCORERS.map(fn => fn(s));
  const composite = Math.round(scores.reduce((a, b) => a + b.score, 0) / scores.length);
  return { scores, composite };
}

export default function Compare() {
  const [symA, setSymA] = useState('TCS');
  const [symB, setSymB] = useState('INFY');

  const stockA = STOCKS[symA as keyof typeof STOCKS];
  const stockB = STOCKS[symB as keyof typeof STOCKS];
  const { scores: scoresA, composite: compA } = getScores(symA);
  const { scores: scoresB, composite: compB } = getScores(symB);

  const SYMBOLS = Object.keys(STOCKS);

  return (
    <div style={{ fontFamily: 'monospace', background: '#050508', color: '#E2E8F0', minHeight: '100vh', padding: 24 }}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600&display=swap"/>
      
      <Link href="/" style={{ color: '#F59E0B', textDecoration: 'none', fontSize: 12, marginBottom: 20, display: 'inline-block' }}>← Back to Dashboard</Link>
      
      <div style={{ fontFamily: 'Cinzel, Georgia', fontSize: 20, color: '#F59E0B', letterSpacing: 3, marginBottom: 4 }}>COMPARE STOCKS</div>
      <div style={{ fontSize: 10, color: '#334155', letterSpacing: 2, marginBottom: 24 }}>SIDE BY SIDE RISHI ANALYSIS</div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px 1fr', gap: 12, marginBottom: 24, alignItems: 'center' }}>
        <select value={symA} onChange={e => setSymA(e.target.value)} style={{ background: '#09090F', border: '1px solid #1E293B', borderRadius: 6, padding: '10px 14px', color: '#E2E8F0', fontSize: 13, fontFamily: 'inherit' }}>
          {SYMBOLS.map(s => <option key={s} value={s}>{s} — {STOCKS[s as keyof typeof STOCKS].name}</option>)}
        </select>
        <div style={{ textAlign: 'center', color: '#F59E0B', fontSize: 16, fontWeight: 700 }}>VS</div>
        <select value={symB} onChange={e => setSymB(e.target.value)} style={{ background: '#09090F', border: '1px solid #1E293B', borderRadius: 6, padding: '10px 14px', color: '#E2E8F0', fontSize: 13, fontFamily: 'inherit' }}>
          {SYMBOLS.map(s => <option key={s} value={s}>{s} — {STOCKS[s as keyof typeof STOCKS].name}</option>)}
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 24 }}>
        {[
          { sym: symA, stock: stockA, composite: compA, scores: scoresA, color: '#F59E0B' },
          { sym: symB, stock: stockB, composite: compB, scores: scoresB, color: '#818CF8' },
        ].map(({ sym, stock, composite, scores, color }) => (
          <div key={sym} style={{ background: '#09090F', border: `1px solid ${color}30`, borderRadius: 8, padding: 20 }}>
            <div style={{ fontFamily: 'Cinzel, Georgia', fontSize: 16, color: '#F5E6D3', marginBottom: 4 }}>{stock.name}</div>
            <div style={{ fontSize: 10, color: '#475569', marginBottom: 12 }}>{stock.sector} · {stock.exchange}</div>
            <div style={{ fontSize: 42, fontWeight: 700, color: sc(composite), marginBottom: 4 }}>{composite}</div>
            <div style={{ fontSize: 10, color: sc(composite), marginBottom: 16 }}>{getSig(composite)} · {stock.price.toLocaleString()}</div>
            
            {scores.map((s: any) => (
              <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 10, color: '#64748B', width: 90 }}>{s.name}</span>
                <div style={{ flex: 1, background: '#1E293B', borderRadius: 2, height: 3 }}>
                  <div style={{ width: s.score + '%', background: sc(s.score), height: '100%', borderRadius: 2 }}></div>
                </div>
                <span style={{ fontSize: 11, color: sc(s.score), width: 26, textAlign: 'right', fontWeight: 600 }}>{s.score}</span>
              </div>
            ))}
            
            <Link href={`/stock/${sym}`} style={{ display: 'inline-block', marginTop: 12, padding: '6px 12px', borderRadius: 4, background: `${color}15`, border: `1px solid ${color}40`, color: color, fontSize: 10, textDecoration: 'none', fontWeight: 600 }}>Deep Analyze →</Link>
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

      <div style={{ marginTop: 24, textAlign: 'center', fontSize: 9, color: '#0F172A', letterSpacing: 1 }}>NOT INVESTMENT ADVICE · EDUCATIONAL SIMULATION</div>
    </div>
  );
}