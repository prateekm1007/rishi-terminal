'use client';

import { useState } from 'react';
import { sc } from '../../lib/utils';

const RISHIS = [
  { id: 'jhunjhunwala', name: 'Jhunjhunwala', full: 'Rakesh Jhunjhunwala', origin: 'Bharat', emoji: '🦁', color: '#F59E0B', label: 'Conviction Multibagger', bio: 'Big Bull of India. Concentrated bets on high-growth companies.', philosophy: 'Buy right, sit tight.', formula: 'P/CF(25%) + Growth(25%) + Quality(20%) + Conviction(20%)', bestFor: ['Growth', 'Long Term'], famousPicks: ['Titan', 'Star Health'], quote: 'I am a firm believer in India story.' },
  { id: 'damani', name: 'Damani', full: 'Radhakishan Damani', origin: 'Bharat', emoji: '🏰', color: '#10B981', label: 'Zero-Debt Fortress', bio: 'DMart founder. Obsessed with debt-free businesses.', philosophy: 'Debt-free means never bankrupt.', formula: 'Zero-Debt(30%) + ROCE(25%) + CashFlow(20%) + Moat(15%)', bestFor: ['Defensive', 'Debt-Free'], famousPicks: ['DMart'], quote: 'Never invest in a business you cannot understand.' },
  { id: 'kacholia', name: 'Kacholia', full: 'Ashish Kacholia', origin: 'Bharat', emoji: '🐋', color: '#818CF8', label: 'Whale Small-Cap Hunter', bio: 'Finds small-cap multibaggers before mainstream discovers.', philosophy: 'High promoter ownership plus accelerating FCF.', formula: 'Promoter(30%) + FCF(25%) + ROCE(20%) + Size(15%)', bestFor: ['Small Cap', 'Hidden Gems'], famousPicks: ['Vaibhav Global'], quote: 'Small caps with high promoter holding = real wealth.' },
  { id: 'kedia', name: 'Kedia', full: 'Vijay Kedia', origin: 'Bharat', emoji: '😊', color: '#F59E0B', label: 'SMILE Formula', bio: 'Created SMILE framework. Patient long-term approach.', philosophy: 'Small, Manageable, Innovative, Listed, Emerging.', formula: 'Small(20%) + Debt(20%) + Margins(20%) + Growth(20%)', bestFor: ['SMILE', 'Mid Cap'], famousPicks: ['Cera'], quote: 'Market transfers money from impatient to patient.' },
  { id: 'porinju', name: 'Porinju', full: 'Porinju Veliyath', origin: 'Bharat', emoji: '🔍', color: '#10B981', label: 'Contrarian Deep Value', bio: 'Finds value in beaten-down stocks. Looks for catalysts.', philosophy: 'Buy when there is maximum pessimism.', formula: 'Contrarian(30%) + Management(25%) + Undervalue(25%)', bestFor: ['Deep Value', 'Turnarounds'], famousPicks: ['Stove Kraft'], quote: 'Best investments come with maximum pessimism.' },
  { id: 'raamdeo', name: 'Raamdeo', full: 'Raamdeo Agrawal', origin: 'Bharat', emoji: '⚖️', color: '#818CF8', label: 'QGLP Framework', bio: 'Developed QGLP framework for compounding businesses.', philosophy: 'Quality, Growth, Longevity, Price balance.', formula: 'Quality(30%) + Growth(25%) + Longevity(25%) + Price(20%)', bestFor: ['Compounders', 'Quality Growth'], famousPicks: ['Page Industries'], quote: 'Quality plus Growth plus Longevity at Right Price.' },
  { id: 'nemish', name: 'Nemish', full: 'Nemish Shah', origin: 'Bharat', emoji: '📈', color: '#10B981', label: 'Steady Compounder', bio: 'Boring, steady businesses that compound for decades.', philosophy: 'Consistency beats excitement.', formula: 'EPS(35%) + Debt-Free(30%) + Management(20%)', bestFor: ['Long Hold', 'Boring'], famousPicks: ['V-Guard'], quote: 'Boring businesses compound into fortunes.' },
  { id: 'basant', name: 'Basant', full: 'Basant Maheshwari', origin: 'Bharat', emoji: '🛒', color: '#F59E0B', label: 'Consumption Growth', bio: 'Focuses on India consumption growth megatrend.', philosophy: 'India consuming more. Invest in this wave.', formula: 'Consumer(30%) + Revenue(25%) + Margins(25%)', bestFor: ['Consumption', 'Growth'], famousPicks: ['Berger Paints'], quote: 'Indian consumption story just beginning.' },
  { id: 'buffett', name: 'Buffett', full: 'Warren Buffett', origin: 'Global', emoji: '🍎', color: '#10B981', label: 'Quality Moat', bio: 'Oracle of Omaha. Durable competitive advantages.', philosophy: 'Wonderful companies at fair prices.', formula: 'ROE(30%) + Moat(25%) + Earnings(20%)', bestFor: ['Quality', 'Long Term'], famousPicks: ['Coca Cola', 'Apple'], quote: 'Wonderful company at fair price beats fair company at wonderful price.' },
  { id: 'graham', name: 'Graham', full: 'Benjamin Graham', origin: 'Global', emoji: '📚', color: '#818CF8', label: 'Deep Value', bio: 'Father of value investing. Margin of safety obsessed.', philosophy: 'Buy at significant discount to intrinsic value.', formula: 'NCAV(40%) + P/E(25%) + Debt(20%)', bestFor: ['Deep Value', 'Asset Plays'], famousPicks: ['GEICO'], quote: 'Margin of safety is central concept of investing.' },
  { id: 'lynch', name: 'Lynch', full: 'Peter Lynch', origin: 'Global', emoji: '📈', color: '#F59E0B', label: 'GARP', bio: 'Fidelity Magellan 29% annual returns for 13 years.', philosophy: 'Growth At a Reasonable Price.', formula: 'PEG(30%) + Growth(25%) + FCF(20%)', bestFor: ['GARP', 'Growth'], famousPicks: ['Dunkin Donuts'], quote: 'Invest in what you know.' },
  { id: 'munger', name: 'Munger', full: 'Charlie Munger', origin: 'Global', emoji: '🧠', color: '#818CF8', label: 'Mental Models', bio: 'Buffetts partner. Inversion and mental models expert.', philosophy: 'Always invert the problem.', formula: 'Circle(30%) + Inversion(25%) + Quality(25%)', bestFor: ['Quality', 'Mental Models'], famousPicks: ['Costco'], quote: 'Invert always invert.' },
  { id: 'greenblatt', name: 'Greenblatt', full: 'Joel Greenblatt', origin: 'Global', emoji: '✨', color: '#10B981', label: 'Magic Formula', bio: 'Created Magic Formula. Systematic value plus quality.', philosophy: 'Good businesses at cheap prices.', formula: 'ROC(50%) + EarningsYield(50%)', bestFor: ['Systematic', 'Quant'], famousPicks: ['Various'], quote: 'Figure out value and pay lot less.' },
  { id: 'pabrai', name: 'Pabrai', full: 'Mohnish Pabrai', origin: 'Global', emoji: '🎯', color: '#F59E0B', label: 'Dhandho Cloner', bio: 'Clones best ideas. Dhandho framework expert.', philosophy: 'Heads I win tails I do not lose much.', formula: 'Clone(30%) + Owner(25%) + Risk(25%)', bestFor: ['Cloning', 'Asymmetric'], famousPicks: ['Fiat Chrysler'], quote: 'Heads I win tails I do not lose much.' },
  { id: 'philipfisher', name: 'Philip Fisher', full: 'Philip Fisher', origin: 'Global', emoji: '🔬', color: '#818CF8', label: 'Scuttlebutt Growth', bio: 'Talks to insiders. Seeks high-quality growth.', philosophy: 'Deep research and management quality.', formula: 'Management(25%) + RandD(25%) + Growth(25%)', bestFor: ['Growth', 'Quality'], famousPicks: ['Xerox'], quote: 'Person with right info beats person with right advice.' },
  { id: 'howardmarks', name: 'Howard Marks', full: 'Howard Marks', origin: 'Global', emoji: '🔄', color: '#F59E0B', label: 'Risk Cycle', bio: 'Market cycle expert. Fear and greed investor.', philosophy: 'Buy when scared, sell when greedy.', formula: 'Cycle(30%) + Safety(25%) + Asymmetry(25%)', bestFor: ['Cycle', 'Contrarian'], famousPicks: ['Various'], quote: 'Most try to buy low sell high. I buy in panic.' },
  { id: 'sethklarman', name: 'Seth Klarman', full: 'Seth Klarman', origin: 'Global', emoji: '🛡️', color: '#10B981', label: 'Asymmetric Safety', bio: 'Baupost founder. Downside protection obsessed.', philosophy: 'Protect downside, upside takes care of itself.', formula: 'Downside(40%) + Asymmetry(30%) + Safety(15%)', bestFor: ['Defensive', 'Asymmetric'], famousPicks: ['Distressed'], quote: 'Best returns from minimal downside situations.' },
  { id: 'templeton', name: 'John Templeton', full: 'John Templeton', origin: 'Global', emoji: '🌍', color: '#818CF8', label: 'Maximum Pessimism', bio: 'Global value investor. Buys maximum pessimism.', philosophy: 'Best time is maximum pessimism.', formula: 'Pessimism(35%) + Discount(30%) + Quality(20%)', bestFor: ['Contrarian', 'Global'], famousPicks: ['Japan 1980s'], quote: 'Best time to buy is maximum pessimism.' },
  { id: 'schloss', name: 'Walter Schloss', full: 'Walter Schloss', origin: 'Global', emoji: '💎', color: '#10B981', label: 'Cigar Butt', bio: 'Graham student. 16% annual returns for decades.', philosophy: 'Buy cheap, diversify widely.', formula: 'P/B(40%) + ZeroDebt(30%) + Insider(20%)', bestFor: ['Deep Value', 'Low Risk'], famousPicks: ['Cheap stocks'], quote: 'We buy cheap stocks and wait for less cheap.' },
];

export default function RishisPage() {
  const [sel, setSel] = useState<string | null>(null);
  const [filter, setFilter] = useState<'All' | 'Bharat' | 'Global'>('All');

  const filtered = RISHIS.filter(r => filter === 'All' || r.origin === filter);

  return (
    <div style={{ fontFamily: 'monospace', background: '#050508', color: '#E2E8F0', minHeight: '100vh', padding: 24 }}>
      <div style={{ fontSize: 20, color: '#F59E0B', marginBottom: 4 }}>THE RISHIS</div>
      <div style={{ fontSize: 10, color: '#334155', marginBottom: 20 }}>15 INVESTMENT SAGES</div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {(['All', 'Bharat', 'Global'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ background: filter === f ? '#F59E0B15' : '#09090F', border: filter === f ? '1px solid #F59E0B40' : '1px solid #1E293B', borderRadius: 6, padding: '7px 18px', color: filter === f ? '#F59E0B' : '#64748B', fontSize: 11, cursor: 'pointer' }}>
            {f === 'Bharat' ? 'Bharat (8)' : f === 'Global' ? 'Global (7)' : 'All (15)'}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
        {filtered.map(r => (
          <div key={r.id} onClick={() => setSel(sel === r.id ? null : r.id)}
            style={{ background: '#09090F', border: `1px solid ${sel === r.id ? r.color + '60' : '#1E293B'}`, borderRadius: 8, padding: 18, cursor: 'pointer' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 24, marginBottom: 4 }}>{r.emoji}</div>
                <div style={{ fontSize: 15, color: '#F5E6D3', fontFamily: 'Georgia' }}>{r.full}</div>
                <div style={{ fontSize: 10, color: '#475569', marginTop: 2 }}>{r.label}</div>
              </div>
              <span style={{ padding: '3px 8px', borderRadius: 3, background: r.origin === 'Bharat' ? '#F59E0B15' : '#818CF815', fontSize: 9, color: r.origin === 'Bharat' ? '#F59E0B' : '#818CF8' }}>
                {r.origin === 'Bharat' ? 'Bharat' : 'Global'}
              </span>
            </div>
            <div style={{ fontSize: 10, color: '#64748B', lineHeight: 1.6, marginBottom: 10 }}>{r.bio.slice(0, 100)}...</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
              {r.bestFor.map(tag => (
                <span key={tag} style={{ padding: '2px 7px', borderRadius: 3, background: '#1E293B', fontSize: 9, color: '#64748B' }}>{tag}</span>
              ))}
            </div>
            <div style={{ fontSize: 10, color: '#334155', textAlign: 'right' }}>{sel === r.id ? 'collapse' : 'expand'}</div>
            {sel === r.id && (
              <div style={{ marginTop: 14, borderTop: '1px solid #1E293B', paddingTop: 14 }}>
                <div style={{ fontSize: 10, color: '#94A3B8', lineHeight: 1.7, marginBottom: 8 }}>{r.bio}</div>
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 9, color: '#475569' }}>PHILOSOPHY</div>
                  <div style={{ fontSize: 10, color: '#CBD5E1' }}>{r.philosophy}</div>
                </div>
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 9, color: '#475569' }}>FORMULA</div>
                  <div style={{ fontSize: 10, color: r.color }}>{r.formula}</div>
                </div>
                <div style={{ padding: '8px 10px', background: '#0A0A16', borderRadius: 4, borderLeft: `2px solid ${r.color}60` }}>
                  <div style={{ fontSize: 9, color: '#475569' }}>QUOTE</div>
                  <div style={{ fontSize: 11, color: '#94A3B8', fontStyle: 'italic' }}>"{r.quote}"</div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      <div style={{ marginTop: 20, textAlign: 'center', fontSize: 9, color: '#0F172A' }}>NOT INVESTMENT ADVICE</div>
    </div>
  );
}