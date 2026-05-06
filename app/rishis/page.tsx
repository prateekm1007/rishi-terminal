'use client';

import { useState } from 'react';
import Link from 'next/link';
import { STOCKS } from '../../data/stocks';
import { buildConsensus } from '../../lib/consensus';

type Category = 'All' | 'Stock' | 'Crypto' | 'Commodity' | 'Forex';
type ViewMode = 'catalog' | 'compare';

const ALL_RISHIS = [
  // STOCK RISHIS - BHARAT
  { id: 'jhunjhunwala', name: 'Rakesh Jhunjhunwala', emoji: '🦁', category: 'Stock', origin: 'Bharat', tier: 'Legend', label: 'Conviction Multibagger', bio: 'Big Bull of India. Concentrated bets on high-growth companies with deep conviction.', philosophy: 'Buy right, sit tight. India growth story is just beginning.', formula: 'P/CF (25%) + Growth (25%) + Quality (20%) + Conviction (20%) + Sentiment (10%)', bestFor: ['Growth', 'Long Term', 'Large Cap'], quote: 'I am a firm believer in the India story.', famousPicks: ['Titan', 'Star Health', 'Crisil'] },
  { id: 'damani', name: 'Radhakishan Damani', emoji: '🏰', category: 'Stock', origin: 'Bharat', tier: 'Legend', label: 'Zero-Debt Fortress', bio: 'DMart founder. Obsessed with debt-free businesses and consistent cash flows.', philosophy: 'Debt-free means never bankrupt. Cash is king.', formula: 'Zero-Debt (30%) + ROCE (25%) + Cash Flow (20%) + Moat (15%) + Management (10%)', bestFor: ['Defensive', 'Debt-Free', 'Quality'], quote: 'Never invest in a business you cannot understand.', famousPicks: ['DMart', 'VST Industries'] },
  { id: 'kacholia', name: 'Ashish Kacholia', emoji: '🐋', category: 'Stock', origin: 'Bharat', tier: 'Master', label: 'Whale Small-Cap Hunter', bio: 'Finds small-cap multibaggers before the mainstream discovers them.', philosophy: 'High promoter ownership plus accelerating FCF equals real wealth creation.', formula: 'Promoter (30%) + FCF (25%) + ROCE (20%) + Size (15%) + Momentum (10%)', bestFor: ['Small Cap', 'Hidden Gems', 'Multibagger'], quote: 'Small caps with high promoter holding are where real wealth is created.', famousPicks: ['Vaibhav Global', 'Newgen Software'] },
  { id: 'kedia', name: 'Vijay Kedia', emoji: '😊', category: 'Stock', origin: 'Bharat', tier: 'Master', label: 'SMILE Formula', bio: 'Created the SMILE framework. Patient long-term approach to emerging businesses.', philosophy: 'Small, Manageable, Innovative, Listed, Emerging - the perfect multibagger.', formula: 'Small (20%) + Manageable (20%) + Innovation (20%) + Listing Premium (20%) + Emerging (20%)', bestFor: ['SMILE', 'Mid Cap', 'Emerging'], quote: 'Market transfers money from the impatient to the patient.', famousPicks: ['Cera Sanitaryware', 'Atul Auto'] },
  { id: 'porinju', name: 'Porinju Veliyath', emoji: '🔍', category: 'Stock', origin: 'Bharat', tier: 'Master', label: 'Contrarian Deep Value', bio: 'Finds value in beaten-down stocks that others have abandoned. Specializes in turnarounds.', philosophy: 'Buy when there is maximum pessimism. Contrarian investing creates real alpha.', formula: 'Contrarian (30%) + Management (25%) + Undervalue (25%) + Catalyst (20%)', bestFor: ['Deep Value', 'Turnarounds', 'Contrarian'], quote: 'The best investments come with maximum pessimism.', famousPicks: ['Stove Kraft', 'Geojit Financial'] },
  { id: 'raamdeo', name: 'Raamdeo Agrawal', emoji: '⚖️', category: 'Stock', origin: 'Bharat', tier: 'Master', label: 'QGLP Framework', bio: 'Co-founder of Motilal Oswal. Developed QGLP framework for compounding businesses.', philosophy: 'Quality, Growth, Longevity, Price - the four pillars of wealth creation.', formula: 'Quality (30%) + Growth (25%) + Longevity (25%) + Price (20%)', bestFor: ['Compounders', 'Quality Growth', 'QGLP'], quote: 'Quality plus Growth plus Longevity at Right Price is the mantra.', famousPicks: ['Page Industries', 'Eicher Motors'] },
  { id: 'nemish', name: 'Nemish Shah', emoji: '📈', category: 'Stock', origin: 'Bharat', tier: 'Master', label: 'Steady Compounder', bio: 'Boring, steady businesses that compound for decades. Consistency over excitement.', philosophy: 'Consistency beats excitement. Boring businesses compound into fortunes.', formula: 'EPS Growth (35%) + Debt-Free (30%) + Management Quality (20%) + Valuation (15%)', bestFor: ['Long Hold', 'Boring Business', 'Compounder'], quote: 'Boring businesses compound into fortunes over decades.', famousPicks: ['V-Guard Industries'] },
  { id: 'basant', name: 'Basant Maheshwari', emoji: '🛒', category: 'Stock', origin: 'Bharat', tier: 'Master', label: 'Consumption Growth', bio: 'Focuses on India consumption growth megatrend. Early identifier of consumer stocks.', philosophy: 'India is consuming more every year. Invest in this unstoppable wave.', formula: 'Consumer Theme (30%) + Revenue Growth (25%) + Margins (25%) + PE Premium (20%)', bestFor: ['Consumption', 'Growth', 'India Theme'], quote: 'The Indian consumption story is just beginning.', famousPicks: ['Berger Paints', 'HDFC Bank'] },
  
  // STOCK RISHIS - GLOBAL
  { id: 'buffett', name: 'Warren Buffett', emoji: '🎩', category: 'Stock', origin: 'Global', tier: 'Legend', label: 'Quality Moat', bio: 'Oracle of Omaha. Seeks durable competitive advantages and exceptional management.', philosophy: 'Far better to buy a wonderful company at a fair price than a fair company at a wonderful price.', formula: 'ROE (30%) + Economic Moat (25%) + Earnings Power (20%) + Management (15%) + Price (10%)', bestFor: ['Quality', 'Long Term', 'Moat'], quote: 'Wonderful company at fair price beats fair company at wonderful price.', famousPicks: ['Coca-Cola', 'Apple', 'American Express'] },
  { id: 'graham', name: 'Benjamin Graham', emoji: '📚', category: 'Stock', origin: 'Global', tier: 'Legend', label: 'Deep Value', bio: 'Father of value investing. Margin of safety is his central concept.', philosophy: 'Buy at a significant discount to intrinsic value. Mr. Market is your servant, not master.', formula: 'NCAV (40%) + P/E Below Market (25%) + Low Debt (20%) + Earnings Stability (15%)', bestFor: ['Deep Value', 'Asset Plays', 'Safety'], quote: 'Margin of safety is the central concept of investment.', famousPicks: ['GEICO'] },
  { id: 'lynch', name: 'Peter Lynch', emoji: '📈', category: 'Stock', origin: 'Global', tier: 'Legend', label: 'GARP', bio: 'Fidelity Magellan fund - 29% annual returns for 13 years. Champion of retail investors.', philosophy: 'Invest in what you know. Growth at a reasonable price.', formula: 'PEG Ratio (30%) + Earnings Growth (25%) + FCF (20%) + Category (15%) + Story (10%)', bestFor: ['GARP', 'Growth', 'Consumer'], quote: 'Invest in what you know.', famousPicks: ['Dunkin Donuts', 'Chrysler'] },
  { id: 'munger', name: 'Charlie Munger', emoji: '🧠', category: 'Stock', origin: 'Global', tier: 'Legend', label: 'Mental Models', bio: 'Buffett partner. Inversion, latticework of mental models, and multidisciplinary thinking.', philosophy: 'Invert, always invert. The key to success is avoiding stupidity, not seeking brilliance.', formula: 'Circle of Competence (30%) + Inversion (25%) + Quality Business (25%) + Fair Price (20%)', bestFor: ['Quality', 'Mental Models', 'Long Term'], quote: 'Invert, always invert.', famousPicks: ['Costco', 'Berkshire Hathaway'] },
  { id: 'greenblatt', name: 'Joel Greenblatt', emoji: '✨', category: 'Stock', origin: 'Global', tier: 'Master', label: 'Magic Formula', bio: 'Created the Magic Formula. Systematic combination of high ROC and high earnings yield.', philosophy: 'Good businesses at cheap prices. Be systematic and trust the process.', formula: 'Return on Capital (50%) + Earnings Yield (50%)', bestFor: ['Systematic', 'Quant', 'Value'], quote: 'Figure out the value of something and then pay a lot less for it.', famousPicks: ['Various - systematic approach'] },
  { id: 'pabrai', name: 'Mohnish Pabrai', emoji: '🎯', category: 'Stock', origin: 'Global', tier: 'Master', label: 'Dhandho Cloner', bio: 'Clones the best ideas from the best investors. Dhandho framework - high upside, low downside.', philosophy: 'Heads I win, tails I don not lose much. Clone shamelessly from the best.', formula: 'Clone Score (30%) + Owner-Operator (25%) + Downside Protection (25%) + Upside (20%)', bestFor: ['Cloning', 'Asymmetric', 'Value'], quote: 'Heads I win, tails I don not lose much.', famousPicks: ['Fiat Chrysler', 'Rain Industries'] },
  { id: 'philipfisher', name: 'Philip Fisher', emoji: '🔬', category: 'Stock', origin: 'Global', tier: 'Master', label: 'Scuttlebutt Growth', bio: 'Pioneer of growth investing. Deep qualitative research through scuttlebutt method.', philosophy: 'Outstanding companies with outstanding management. Hold forever.', formula: 'Management Quality (25%) + R&D Strength (25%) + Revenue Growth (25%) + Margins (25%)', bestFor: ['Growth', 'Quality Management', 'Long Term'], quote: 'The person with the right information beats the person with the right advice.', famousPicks: ['Motorola', 'Texas Instruments'] },
  { id: 'howardmarks', name: 'Howard Marks', emoji: '🔄', category: 'Stock', origin: 'Global', tier: 'Master', label: 'Risk Cycle', bio: 'Oaktree Capital founder. Market cycle expert. Understanding risk is his superpower.', philosophy: 'Buy when others are scared, sell when others are greedy. Most important thing is risk.', formula: 'Cycle Position (30%) + Margin of Safety (25%) + Risk Asymmetry (25%) + Sentiment (20%)', bestFor: ['Cycle', 'Contrarian', 'Risk Management'], quote: 'Most people try to find good assets. I try to find good risk/reward.', famousPicks: ['Distressed debt', 'High yield bonds'] },
  { id: 'sethklarman', name: 'Seth Klarman', emoji: '🛡️', category: 'Stock', origin: 'Global', tier: 'Master', label: 'Asymmetric Safety', bio: 'Baupost Group founder. Downside protection obsessed. The most secretive great investor.', philosophy: 'Protect the downside and the upside takes care of itself.', formula: 'Downside Protection (40%) + Asymmetric Return (30%) + Margin of Safety (15%) + Catalyst (15%)', bestFor: ['Defensive', 'Asymmetric', 'Deep Value'], quote: 'The best returns come from situations where downside is minimal.', famousPicks: ['Distressed assets', 'Special situations'] },
  { id: 'templeton', name: 'John Templeton', emoji: '🌍', category: 'Stock', origin: 'Global', tier: 'Legend', label: 'Maximum Pessimism', bio: 'Global value investor pioneer. Buys at the point of maximum pessimism worldwide.', philosophy: 'The best time to invest is at maximum pessimism. Look everywhere globally.', formula: 'Pessimism Score (35%) + Global Discount (30%) + Quality Business (20%) + Catalyst (15%)', bestFor: ['Contrarian', 'Global', 'Deep Value'], quote: 'The best time to buy is at the point of maximum pessimism.', famousPicks: ['Japan 1980s', 'Various global bargains'] },
  { id: 'schloss', name: 'Walter Schloss', emoji: '💎', category: 'Stock', origin: 'Global', tier: 'Master', label: 'Cigar Butt', bio: 'Graham student. 16%+ annual returns for 45 years. Pure statistical value investor.', philosophy: 'Buy cheap, diversify widely, and wait for less cheap.', formula: 'Price-to-Book (40%) + Zero Debt (30%) + Insider Buying (20%) + Low PE (10%)', bestFor: ['Deep Value', 'Low Risk', 'Diversified'], quote: 'We buy cheap stocks and wait for them to become less cheap.', famousPicks: ['Statistically cheap stocks'] },
];

const CATEGORY_COLORS: Record<string, string> = {
  Stock: 'var(--accent-gold)',
  Crypto: 'var(--accent-blue)',
  Commodity: '#f97316',
  Forex: '#a78bfa',
};

const TIER_STYLES: Record<string, { bg: string; color: string }> = {
  Legend: { bg: 'rgba(255,215,0,0.15)', color: '#FFD700' },
  Master: { bg: 'rgba(29,155,240,0.15)', color: 'var(--accent-blue)' },
  Specialist: { bg: 'rgba(113,118,123,0.15)', color: 'var(--text-muted)' },
};

export default function RishisPage() {
  const [activeCategory, setActiveCategory] = useState<Category>('All');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('catalog');
  
  // Compare mode state
  const [stockA, setStockA] = useState('TCS');
  const [stockB, setStockB] = useState('INFY');

  const filtered = ALL_RISHIS.filter(r => {
    const matchesCategory = activeCategory === 'All' || r.category === activeCategory;
    const matchesSearch = search === '' ||
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.label.toLowerCase().includes(search.toLowerCase()) ||
      r.bio.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const counts = {
    All: ALL_RISHIS.length,
    Stock: ALL_RISHIS.filter(r => r.category === 'Stock').length,
    Crypto: ALL_RISHIS.filter(r => r.category === 'Crypto').length,
    Commodity: ALL_RISHIS.filter(r => r.category === 'Commodity').length,
    Forex: ALL_RISHIS.filter(r => r.category === 'Forex').length,
  };

  // Compare logic
  const SYMBOLS = Object.keys(STOCKS);
  const consensusA = STOCKS[stockA] ? buildConsensus(STOCKS[stockA]) : null;
  const consensusB = STOCKS[stockB] ? buildConsensus(STOCKS[stockB]) : null;

  return (
    <main className="page-container">
      <div className="page-header">
        <div className="content-wrapper">
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 16, letterSpacing: 2, fontFamily: 'monospace' }}>
            <Link href="/" style={{ color: 'var(--accent-gold)', textDecoration: 'none' }}>RISHI TERMINAL</Link>
            {' > ALL RISHIS'}
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 24, marginBottom: 32 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <span style={{ fontSize: 40 }}>🧘</span>
                <h1 className="philosophy-heading" style={{ fontSize: 32, color: 'var(--accent-gold)', letterSpacing: 2 }}>
                  The Rishis
                </h1>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 600, lineHeight: 1.6 }}>
                {ALL_RISHIS.length} investment legends across Stocks, Crypto, Commodities, and Forex.
                Each Rishi brings a unique philosophical lens to market analysis.
              </p>
            </div>

            {/* View Mode Toggle */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setViewMode('catalog')}
                style={{
                  padding: '10px 20px',
                  background: viewMode === 'catalog' ? 'var(--accent-gold)' : 'var(--bg-secondary)',
                  color: viewMode === 'catalog' ? '#000' : 'var(--text-primary)',
                  border: '1px solid var(--border-primary)',
                  borderRadius: 6,
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                📚 Catalog
              </button>
              <button
                onClick={() => setViewMode('compare')}
                style={{
                  padding: '10px 20px',
                  background: viewMode === 'compare' ? 'var(--accent-gold)' : 'var(--bg-secondary)',
                  color: viewMode === 'compare' ? '#000' : 'var(--text-primary)',
                  border: '1px solid var(--border-primary)',
                  borderRadius: 6,
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                ⚖️ Compare Stocks
              </button>
            </div>
          </div>

          {/* Catalog View Filters */}
          {viewMode === 'catalog' && (
            <>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
                <input
                  type="text"
                  placeholder="Search Rishis..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{
                    flex: 1,
                    minWidth: 200,
                    padding: '10px 16px',
                    borderRadius: 6,
                    fontSize: 13,
                    fontFamily: 'monospace',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-primary)',
                    color: 'var(--text-primary)',
                  }}
                />
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {(['All', 'Stock', 'Crypto', 'Commodity', 'Forex'] as Category[]).map(cat => (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      style={{
                        padding: '8px 16px',
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: activeCategory === cat ? 700 : 400,
                        fontFamily: 'monospace',
                        border: activeCategory === cat ? 'none' : '1px solid var(--border-primary)',
                        background: activeCategory === cat ? (cat === 'All' ? 'var(--accent-gold)' : CATEGORY_COLORS[cat]) : 'var(--bg-card)',
                        color: activeCategory === cat ? '#000' : 'var(--text-muted)',
                        cursor: 'pointer',
                      }}
                    >
                      {cat} ({counts[cat]})
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="content-wrapper" style={{ padding: '28px 24px' }}>

        {/* CATALOG VIEW */}
        {viewMode === 'catalog' && (
          <>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20, fontFamily: 'monospace' }}>
              Showing {filtered.length} Rishis
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {filtered.map(rishi => {
                const isExpanded = expandedId === rishi.id;
                const catColor = CATEGORY_COLORS[rishi.category];
                const tierStyle = TIER_STYLES[rishi.tier] || TIER_STYLES.Specialist;

                return (
                  <div key={rishi.id} className="card-sacred" style={{ padding: 0, overflow: 'hidden', cursor: 'pointer' }}
                    onClick={() => setExpandedId(isExpanded ? null : rishi.id)}>
                    <div style={{ height: 3, background: catColor }} />

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', flexWrap: 'wrap', gap: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <span style={{ fontSize: 28 }}>{rishi.emoji}</span>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <span className="philosophy-heading" style={{ fontSize: 16 }}>{rishi.name}</span>
                            <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 20, background: tierStyle.bg, color: tierStyle.color, fontWeight: 700, fontFamily: 'monospace', letterSpacing: 1 }}>
                              {rishi.tier.toUpperCase()}
                            </span>
                            <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 20, background: `${catColor}20`, color: catColor, fontWeight: 600, fontFamily: 'monospace' }}>
                              {rishi.category.toUpperCase()}
                            </span>
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{rishi.label} · {rishi.origin}</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {rishi.bestFor.slice(0, 3).map(tag => (
                            <span key={tag} style={{ fontSize: 10, padding: '3px 8px', borderRadius: 4, background: 'var(--bg-hover)', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                              {tag}
                            </span>
                          ))}
                        </div>
                        <span style={{ fontSize: 14, color: 'var(--text-muted)', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>▼</span>
                      </div>
                    </div>

                    {isExpanded && (
                      <div style={{ borderTop: '1px solid var(--border-primary)', padding: 20, background: 'var(--bg-secondary)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14, marginBottom: 16 }}>
                          <div style={{ background: 'var(--bg-card)', borderRadius: 8, padding: 16, border: '1px solid var(--border-subtle)' }}>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: 1, marginBottom: 8, fontFamily: 'monospace' }}>BIOGRAPHY</div>
                            <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{rishi.bio}</p>
                          </div>

                          <div style={{ background: 'var(--bg-card)', borderRadius: 8, padding: 16, border: '1px solid var(--border-subtle)' }}>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: 1, marginBottom: 8, fontFamily: 'monospace' }}>PHILOSOPHY</div>
                            <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{rishi.philosophy}</p>
                          </div>

                          <div style={{ background: 'var(--bg-card)', borderRadius: 8, padding: 16, borderLeft: `4px solid ${catColor}`, border: '1px solid var(--border-subtle)' }}>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: 1, marginBottom: 8, fontFamily: 'monospace' }}>QUOTE</div>
                            <p style={{ fontSize: 13, color: catColor, fontStyle: 'italic', lineHeight: 1.7 }}>"{rishi.quote}"</p>
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
                          <div style={{ background: 'var(--bg-card)', borderRadius: 8, padding: 16, border: '1px solid var(--border-subtle)' }}>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: 1, marginBottom: 8, fontFamily: 'monospace' }}>FORMULA</div>
                            <p style={{ fontSize: 11, color: catColor, lineHeight: 1.7, fontFamily: 'monospace' }}>{rishi.formula}</p>
                          </div>

                          <div style={{ background: 'var(--bg-card)', borderRadius: 8, padding: 16, border: '1px solid var(--border-subtle)' }}>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: 1, marginBottom: 8, fontFamily: 'monospace' }}>FAMOUS PICKS</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                              {rishi.famousPicks.map(pick => (
                                <span key={pick} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 4, background: `${catColor}15`, color: catColor, border: `1px solid ${catColor}30`, fontFamily: 'monospace' }}>
                                  {pick}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {filtered.length === 0 && (
              <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
                <p style={{ fontSize: 14 }}>No Rishis match your search</p>
              </div>
            )}
          </>
        )}

        {/* COMPARE VIEW */}
        {viewMode === 'compare' && (
          <>
            <div className="philosophy-heading" style={{ fontSize: 16, letterSpacing: 2, color: 'var(--text-muted)', marginBottom: 20 }}>
              STOCK COMPARISON BY RISHIS
            </div>

            {/* Stock Selectors */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px 1fr', gap: 16, alignItems: 'center', marginBottom: 24 }}>
              <select value={stockA} onChange={e => setStockA(e.target.value)} style={{
                padding: '12px 16px', background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)',
                borderRadius: 6, color: 'var(--text-primary)', fontSize: 13, fontFamily: 'monospace', fontWeight: 600,
              }}>
                {SYMBOLS.map(s => <option key={s} value={s}>{s} - {STOCKS[s].name}</option>)}
              </select>
              <div style={{ textAlign: 'center', color: 'var(--accent-gold)', fontSize: 18, fontWeight: 700 }}>VS</div>
              <select value={stockB} onChange={e => setStockB(e.target.value)} style={{
                padding: '12px 16px', background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)',
                borderRadius: 6, color: 'var(--text-primary)', fontSize: 13, fontFamily: 'monospace', fontWeight: 600,
              }}>
                {SYMBOLS.map(s => <option key={s} value={s}>{s} - {STOCKS[s].name}</option>)}
              </select>
            </div>

            {/* Comparison Grid */}
            {consensusA && consensusB && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
                  {[
                    { sym: stockA, stock: STOCKS[stockA], consensus: consensusA, color: 'var(--accent-gold)' },
                    { sym: stockB, stock: STOCKS[stockB], consensus: consensusB, color: 'var(--accent-blue)' },
                  ].map(({ sym, stock, consensus, color }) => (
                    <div key={sym} className="card-sacred" style={{ padding: 20, borderTop: `3px solid ${color}` }}>
                      <div className="philosophy-heading" style={{ fontSize: 16, marginBottom: 4 }}>{stock.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 14, fontFamily: 'monospace' }}>
                        {stock.sector} · {stock.exchange}
                      </div>
                      <div style={{ fontSize: 48, fontWeight: 900, fontFamily: 'monospace', color, marginBottom: 6 }}>
                        {consensus.consensus}
                      </div>
                      <div style={{ fontSize: 12, color, marginBottom: 14, fontFamily: 'monospace' }}>
                        {consensus.category}
                      </div>

                      {consensus.scores.slice(0, 10).map(r => (
                        <div key={r.name} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                          <span style={{ fontSize: 10, color: 'var(--text-muted)', width: 80, fontFamily: 'monospace' }}>{r.name}</span>
                          <div style={{ flex: 1, height: 18, background: 'var(--bg-secondary)', borderRadius: 2, overflow: 'hidden' }}>
                            <div style={{
                              width: `${r.score}%`,
                              height: '100%',
                              background: r.score >= 75 ? '#00BA7C' : r.score >= 55 ? '#FFD700' : '#F4212E',
                              borderRadius: 2,
                            }} />
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 700, width: 28, textAlign: 'right', fontFamily: 'monospace', color: r.score >= 75 ? '#00BA7C' : r.score >= 55 ? '#FFD700' : '#F4212E' }}>
                            {r.score}
                          </span>
                        </div>
                      ))}

                      <Link href={`/stock/${sym}`} style={{
                        display: 'inline-block',
                        marginTop: 12,
                        padding: '6px 14px',
                        borderRadius: 4,
                        background: `${color}15`,
                        border: `1px solid ${color}40`,
                        color,
                        fontSize: 11,
                        textDecoration: 'none',
                        fontWeight: 600,
                        fontFamily: 'monospace',
                      }}>
                        Deep Analyze →
                      </Link>
                    </div>
                  ))}
                </div>

                {/* Rishi Verdict */}
                <div className="card-sacred" style={{ padding: 20 }}>
                  <div className="philosophy-heading" style={{ fontSize: 14, letterSpacing: 2, color: 'var(--text-muted)', marginBottom: 16 }}>
                    RISHI VERDICT: WHO WINS?
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
                    {consensusA.scores.map((rA, i) => {
                      const rB = consensusB.scores[i];
                      const winner = rA.score > rB.score ? stockA : rB.score > rA.score ? stockB : 'TIE';
                      const winColor = winner === stockA ? 'var(--accent-gold)' : winner === stockB ? 'var(--accent-blue)' : 'var(--text-muted)';

                      return (
                        <div key={rA.name} style={{
                          background: 'var(--bg-secondary)',
                          borderRadius: 6,
                          padding: 12,
                          borderLeft: `3px solid ${winColor}`,
                          border: '1px solid var(--border-subtle)',
                        }}>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 6, fontFamily: 'monospace', letterSpacing: 1 }}>{rA.name.toUpperCase()}</div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                            <span style={{ fontSize: 11, fontFamily: 'monospace', color: winner === stockA ? 'var(--accent-gold)' : 'var(--text-muted)' }}>
                              {stockA}: {rA.score}
                            </span>
                            <span style={{ fontSize: 11, fontFamily: 'monospace', color: winner === stockB ? 'var(--accent-blue)' : 'var(--text-muted)' }}>
                              {stockB}: {rB.score}
                            </span>
                          </div>
                          <div style={{
                            fontSize: 10,
                            color: winColor,
                            fontWeight: 700,
                            textAlign: 'center',
                            padding: '4px',
                            background: `${winColor}15`,
                            borderRadius: 3,
                            fontFamily: 'monospace',
                          }}>
                            {winner === 'TIE' ? 'TIED' : `${winner} WINS`}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </>
        )}

      </div>
    </main>
  );
}