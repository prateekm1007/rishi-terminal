const fs = require('fs');
const path = require('path');

// Helper to write file safely
const write = (file, content) => {
  fs.writeFileSync(path.join(__dirname, file), content, 'utf8');
  console.log('✅ Fixed:', file);
};

// 1. Fix app/page.tsx (Dashboard)
write('app/page.tsx`, `'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { STOCKS } from '../data/stocks';
import { scoreJhunjhunwala, scoreDamani, scoreBuffett, scoreGraham, scoreLynch, scoreKacholia, scoreKedia, scoreMunger, scoreGreenblatt, scorePabrai, scorePorinju, scoreRaamdeo, scoreNemish, scoreBasant, scorePhilipFisher, scoreHowardMarks, scoreSethKlarman, scoreJohnTempleton, scoreWalterSchloss } from '../lib/scorers';
import { sc, getSig, SIG, lbl } from '../lib/utils';

const SCORERS = [scoreJhunjhunwala, scoreDamani, scoreBuffett, scoreGraham, scoreLynch, scoreKacholia, scoreKedia, scoreMunger, scoreGreenblatt, scorePabrai, scorePorinju, scoreRaamdeo, scoreNemish, scoreBasant, scorePhilipFisher, scoreHowardMarks, scoreSethKlarman, scoreJohnTempleton, scoreWalterSchloss];

function getAllScored() {
  return Object.values(STOCKS).map(s => {
    const scores = SCORERS.map(fn => fn(s));
    const composite = Math.round(scores.reduce((a, b) => a + b.score, 0) / scores.length);
    return { ...s, composite };
  }).sort((a, b) => b.composite - a.composite);
}

export default function Dashboard() {
  const [time, setTime] = useState('');
  const allScored = getAllScored();
  const topBuys = allScored.filter(s => getSig(s.composite) === 'BUY').slice(0, 5);
  const stockOfDay = allScored[0];
  const buyCnt = allScored.filter(s => getSig(s.composite) === 'BUY').length;
  const holdCnt = allScored.filter(s => getSig(s.composite) === 'HOLD').length;
  const avoidCnt = allScored.filter(s => getSig(s.composite) === 'AVOID').length;
  const mood = buyCnt > avoidCnt ? 'BULLISH' : avoidCnt > buyCnt ? 'BEARISH' : 'NEUTRAL';
  const moodColor = mood === 'BULLISH' ? '#10B981' : mood === 'BEARISH' ? '#EF4444' : '#F59E0B';

  useEffect(() => {
    const tick = setInterval(() => {
      const now = new Date();
      setTime(now.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' }));
    }, 1000);
    return () => clearInterval(tick);
  }, []);

  return (
    <div style={{ fontFamily: 'monospace', background: '#050508', color: '#E2E8F0', minHeight: '100vh', padding: 24 }}>
      <div style={{ fontFamily: 'Georgia', fontSize: 22, color: '#F59E0B', marginBottom: 20 }}>RISHI TERMINAL 4.0</div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <div style={{ fontSize: 11, color: '#475569' }}>IST: {time}</div>
        <div style={{ padding: '4px 10px', borderRadius: 4, background: moodColor + '15', border: '1px solid ' + moodColor + '40', fontSize: 10, color: moodColor }}>{mood}</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10, marginBottom: 20 }}>
        <div style={{ background: '#09090F', border: '1px solid #1E293B', borderRadius: 8, padding: 14, textAlign: 'center' }}>
          <div style={{ fontSize: 9, color: '#475569' }}>TOTAL STOCKS</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#F59E0B' }}>{Object.keys(STOCKS).length}</div>
        </div>
        <div style={{ background: '#09090F', border: '1px solid #1E293B', borderRadius: 8, padding: 14, textAlign: 'center' }}>
          <div style={{ fontSize: 9, color: '#475569' }}>BUY</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#10B981' }}>{buyCnt}</div>
        </div>
        <div style={{ background: '#09090F', border: '1px solid #1E293B', borderRadius: 8, padding: 14, textAlign: 'center' }}>
          <div style={{ fontSize: 9, color: '#475569' }}>HOLD</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#F59E0B' }}>{holdCnt}</div>
        </div>
        <div style={{ background: '#09090F', border: '1px solid #1E293B', borderRadius: 8, padding: 14, textAlign: 'center' }}>
          <div style={{ fontSize: 9, color: '#475569' }}>AVOID</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#EF4444' }}>{avoidCnt}</div>
        </div>
      </div>
      <div style={{ background: '#09090F', border: '1px solid ' + sc(stockOfDay.composite) + '30', borderRadius: 8, padding: 18, marginBottom: 20 }}>
        <div style={{ fontSize: 9, color: '#475569' }}>STOCK OF THE DAY</div>
        <div style={{ fontFamily: 'Georgia', fontSize: 16, color: '#F5E6D3' }}>{stockOfDay.name}</div>
        <div style={{ fontSize: 42, fontWeight: 700, color: sc(stockOfDay.composite) }}>{stockOfDay.composite}</div>
        <div style={{ fontSize: 10, color: sc(stockOfDay.composite) }}>{lbl(stockOfDay.composite)} - {getSig(stockOfDay.composite)}</div>
      </div>
      <div style={{ background: '#09090F', border: '1px solid #10B98130', borderRadius: 8, padding: 18 }}>
        <div style={{ fontSize: 9, color: '#10B981' }}>TOP BUYS</div>
        {topBuys.map((s, i) => (
          <div key={s.symbol} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #1E293B' }}>
            <Link href={'/stock/' + s.symbol} style={{ color: '#F59E0B', textDecoration: 'none' }}>{s.symbol}</Link>
            <span style={{ color: '#10B981' }}>{s.composite}</span>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 20, textAlign: 'center', fontSize: 9, color: '#0F172A' }}>NOT INVESTMENT ADVICE</div>
    </div>
  );
}
`);

// 2. Fix app/screener/page.tsx
write('app/screener/page.tsx`, `'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { STOCKS } from '../../data/stocks';
import { scoreJhunjhunwala, scoreDamani, scoreBuffett, scoreGraham, scoreLynch, scoreKacholia, scoreKedia, scoreMunger, scoreGreenblatt, scorePabrai, scorePorinju, scoreRaamdeo, scoreNemish, scoreBasant, scorePhilipFisher, scoreHowardMarks, scoreSethKlarman, scoreJohnTempleton, scoreWalterSchloss } from '../../lib/scorers';
import { sc, getSig, SIG } from '../../lib/utils';

const SCORERS = [scoreJhunjhunwala, scoreDamani, scoreBuffett, scoreGraham, scoreLynch, scoreKacholia, scoreKedia, scoreMunger, scoreGreenblatt, scorePabrai, scorePorinju, scoreRaamdeo, scoreNemish, scoreBasant, scorePhilipFisher, scoreHowardMarks, scoreSethKlarman, scoreJohnTempleton, scoreWalterSchloss];
const SECTORS = ['All', ...Array.from(new Set(Object.values(STOCKS).map(s => s.sector)))];

export default function Screener() {
  const [minScore, setMinScore] = useState(0);
  const [sector, setSector] = useState('All');
  const [search, setSearch] = useState('');

  const rows = useMemo(() => {
    return Object.values(STOCKS)
      .filter(s => sector === 'All' || s.sector === sector)
      .filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.symbol.toLowerCase().includes(search.toLowerCase()))
      .map(s => {
        const scores = SCORERS.map(fn => fn(s));
        const composite = Math.round(scores.reduce((a, b) => a + b.score, 0) / scores.length);
        return { ...s, composite };
      })
      .filter(s => s.composite >= minScore)
      .sort((a, b) => b.composite - a.composite);
  }, [minScore, sector, search]);

  return (
    <div style={{ fontFamily: 'monospace', background: '#050508', color: '#E2E8F0', minHeight: '100vh', padding: 24 }}>
      <div style={{ fontSize: 20, color: '#F59E0B', marginBottom: 20 }}>SCREENER (15 RISHIS)</div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} style={{ padding: 8 }} />
        <select value={sector} onChange={e => setSector(e.target.value)}>
          {SECTORS.map(s => <option key={s}>{s}</option>)}
        </select>
        <input type="range" min={0} max={90} value={minScore} onChange={e => setMinScore(Number(e.target.value))}/>
      </div>
      <table style={{ width: '100%' }}>
        <thead><tr><th>Symbol</th><th>Name</th><th>Score</th><th>Signal</th></tr></thead>
        <tbody>
          {rows.map(s => {
            const sig = getSig(s.composite);
            return (
              <tr key={s.symbol}>
                <td><Link href={'/stock/' + s.symbol} style={{ color: '#F59E0B' }}>{s.symbol}</Link></td>
                <td>{s.name}</td>
                <td style={{ color: sc(s.composite) }}>{s.composite}</td>
                <td style={{ color: SIG[sig] }}>{sig}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
`);

console.log('\\n🚀 All files fixed! Refresh your browser now.');