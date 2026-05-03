'use client';
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
      <div style={{ fontSize: 20, color: '#F59E0B', marginBottom: 4 }}>RISHI SCREENER</div>
      <div style={{ fontSize: 10, color: '#334155', marginBottom: 20 }}>15 RISHIS - {Object.keys(STOCKS).length} STOCKS</div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <input
          placeholder="Search symbol or name"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ background: '#09090F', border: '1px solid #1E293B', borderRadius: 6, padding: '8px 12px', color: '#E2E8F0', fontSize: 12 }}
        />
        <select value={sector} onChange={e => setSector(e.target.value)}
          style={{ background: '#09090F', border: '1px solid #1E293B', borderRadius: 6, padding: '8px 12px', color: '#E2E8F0', fontSize: 12 }}>
          {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: '#475569' }}>Min Score: {minScore}</span>
          <input type="range" min={0} max={90} value={minScore} onChange={e => setMinScore(Number(e.target.value))} />
        </div>
        <span style={{ fontSize: 11, color: '#475569', display: 'flex', alignItems: 'center' }}>{rows.length} results</span>
      </div>
      <div style={{ overflowX: 'auto', background: '#09090F', borderRadius: 8, border: '1px solid #1E293B' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
          <thead>
            <tr style={{ background: '#06060D', borderBottom: '1px solid #1E293B' }}>
              <th style={{ padding: '8px 12px', color: '#475569', textAlign: 'left', fontSize: 10 }}>SYMBOL</th>
              <th style={{ padding: '8px 12px', color: '#475569', textAlign: 'left', fontSize: 10 }}>NAME</th>
              <th style={{ padding: '8px 12px', color: '#475569', textAlign: 'left', fontSize: 10 }}>SECTOR</th>
              <th style={{ padding: '8px 12px', color: '#475569', textAlign: 'right', fontSize: 10 }}>PRICE</th>
              <th style={{ padding: '8px 12px', color: '#475569', textAlign: 'right', fontSize: 10 }}>SCORE</th>
              <th style={{ padding: '8px 12px', color: '#475569', textAlign: 'center', fontSize: 10 }}>SIGNAL</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s, i) => {
              const sig = getSig(s.composite);
              return (
                <tr key={s.symbol} style={{ borderBottom: '1px solid #0F0F1A', background: i % 2 === 0 ? '#09090F' : '#07070E' }}>
                  <td style={{ padding: '8px 12px' }}>
                    <Link href={'/stock/' + s.symbol} style={{ color: '#F59E0B', fontWeight: 600, textDecoration: 'none' }}>{s.symbol}</Link>
                  </td>
                  <td style={{ padding: '8px 12px', color: '#CBD5E1' }}>{s.name}</td>
                  <td style={{ padding: '8px 12px', color: '#475569' }}>{s.sector}</td>
                  <td style={{ padding: '8px 12px', color: '#F1F5F9', textAlign: 'right' }}>Rs{s.price.toLocaleString('en-US')}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: sc(s.composite), fontSize: 13 }}>{s.composite}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                    <span style={{ padding: '2px 8px', borderRadius: 3, background: SIG[sig] + '15', color: SIG[sig], fontSize: 10 }}>{sig}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: 16, textAlign: 'center', fontSize: 9, color: '#0F172A' }}>NOT INVESTMENT ADVICE</div>
    </div>
  );
}