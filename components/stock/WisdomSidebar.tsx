'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Stock, RishiScore } from '../../lib/types';

interface WisdomSidebarProps {
  stock: Stock;
  scores: RishiScore[];
}

interface HistoricalParallel {
  companies: string[];
  era: string;
  lesson: string;
  rishis: string[];
  quote: string;
  author: string;
}

// Z5 (Round 13): the chat pane loads on the first Chat-tab activation —
// interactive-only, ssr:false costs nothing visible and keeps every stock
// page's first-load JS free of the chat client (message state, /api/chat
// wiring, provenance renderer).
const WisdomChat = dynamic(() => import('./WisdomChat').then(m => m.WisdomChat), { ssr: false });

const HISTORICAL_PARALLELS: Record<string, HistoricalParallel> = {
  consumer_moat: {
    companies: ['Titan (2010)', 'Asian Paints (2008)', 'Nestle India (2005)'],
    era: '2005-2015 India Consumption Boom',
    lesson: 'Brand moats combined with patient capital created generational wealth. Companies with pricing power and loyal customers compounded at 25%+ for a decade.',
    rishis: ['Damani', 'Buffett', 'Munger'],
    quote: 'The best businesses are those where the customer cannot do without you.',
    author: 'Radhakishan Damani',
  },
  cyclical_value: {
    companies: ['Tata Steel (2018)', 'Hindalco (2020)', 'Vedanta (2019)'],
    era: 'Commodity Downcycle 2018-2020',
    lesson: 'Low P/E ratios in cyclical industries often signal deteriorating fundamentals, not bargains. Wait for the cycle to turn before deploying capital.',
    rishis: ['Graham', 'Marks', 'Klarman'],
    quote: 'Price is what you pay, value is what you get - but in cyclicals, both move together.',
    author: 'Howard Marks',
  },
  growth_premium: {
    companies: ['Zomato (2021)', 'Paytm (2021)', 'Nykaa (2021)'],
    era: 'IPO Mania 2021',
    lesson: 'Narratives without profits are speculative bets, not investments. The market eventually demands profitability, regardless of growth rates.',
    rishis: ['Buffett', 'Munger', 'Klarman'],
    quote: 'Beware of geeks bearing formulas.',
    author: 'Warren Buffett',
  },
  quality_growth: {
    companies: ['HDFC Bank (2005)', 'TCS (2010)', 'Infosys (2008)'],
    era: 'India Services Export Boom',
    lesson: 'Quality companies with sustainable competitive advantages justify premium valuations. Consistent execution over decades creates wealth.',
    rishis: ['Buffett', 'Lynch', 'Raamdeo'],
    quote: 'Time is the friend of the wonderful business, the enemy of the mediocre.',
    author: 'Warren Buffett',
  },
  turnaround: {
    companies: ['Tata Motors (2016)', 'Yes Bank (2020)', 'Suzlon (2018)'],
    era: 'Corporate Turnaround Attempts',
    lesson: 'Turnarounds rarely turn. Broken business models and weak balance sheets usually stay broken despite management promises.',
    rishis: ['Lynch', 'Munger', 'Klarman'],
    quote: 'Turnarounds seldom turn.',
    author: 'Peter Lynch',
  },
  smallcap_gem: {
    companies: ['Dixon (2018)', 'IRCTC (2019)', 'Avenue Supermarts (2017)'],
    era: 'Smallcap Discovery Phase',
    lesson: 'Undiscovered smallcaps with strong fundamentals and honest management can deliver multibagger returns as the market recognizes value.',
    rishis: ['Kacholia', 'Porinju', 'Basant'],
    quote: 'The best investment opportunities are found where others are not looking.',
    author: 'Ashish Kacholia',
  },
};

function detectArchetype(stock: Stock): string | null {
  const { sector, roe, pe, np, revcagr, de, mktcap } = stock;
  if (['FMCG', 'Consumer', 'Retail'].includes(sector) && roe > 20) return 'consumer_moat';
  if (['Metals', 'Energy'].includes(sector) && pe < 10 && pe > 0) return 'cyclical_value';
  if (pe > 50 && np < 0) return 'growth_premium';
  // Y4 (Round 12): Banking removed — a bank is not an IT-services
  // compounder, and the seed's bank D/E 0 (placeholder) made the old
  // IT-plus-Banking rule match on fabricated cleanliness. Banks (and
  // anything else unmatched) show NO analog rather than a wrong one.
  if (sector === 'IT' && roe > 15 && de < 1) return 'quality_growth';
  if (roe < 0 || de > 3) return 'turnaround';
  if (mktcap < 10000 && revcagr > 20 && roe > 15) return 'smallcap_gem';
  return null;
}

// RISHI SYSTEM PROMPTS - Same as in /rishis page


export function WisdomSidebar({ stock, scores }: WisdomSidebarProps) {
  // Z5 (Round 13): the fundamentals overlay block is DELETED — its only
  // consumer was the pre-T7 client-side prompt assembly, which moved to
  // the server in remediation T7. The sidebar kept fetching
  // /api/fundamentals per stock page for values nothing read (a live
  // runtime cost on every page view, now gone).
  const [activeMode, setActiveMode] = useState<"wisdom" | "chat">("wisdom");
  const archetypeKey = detectArchetype(stock);
  const parallel = archetypeKey ? HISTORICAL_PARALLELS[archetypeKey] : null;
  const relevantScores = parallel ? scores.filter(s => parallel.rishis.some(r => s.name === r)) : [];

  return (
    <div style={{
      background: "rgba(17,24,39,0.85)", border: "1px solid rgba(30,41,59,0.8)",
      borderRadius: "16px", overflow: "hidden",
      position: "sticky", top: "80px",
    }}>
      {/* Tab Switcher */}
      <div style={{
        display: "flex", borderBottom: "1px solid rgba(51,65,85,0.5)",
        background: "rgba(5,8,16,0.6)",
      }}>
        {[
          // Round-5 audit (finding 19): labels don't repeat the emoji — the
          // button renders {emoji} {label}, so "📜 Wisdom" + 📜 doubled it.
          { id: "wisdom" as const, label: "Wisdom", emoji: "📜" },
          { id: "chat" as const, label: "Chat", emoji: "💬" },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveMode(tab.id)}
            style={{
              flex: 1, padding: "10px", border: "none",
              background: activeMode === tab.id ? "rgba(212,175,55,0.1)" : "transparent",
              borderBottom: activeMode === tab.id ? "2px solid #D4AF37" : "2px solid transparent",
              color: activeMode === tab.id ? "#D4AF37" : "#64748B",
              fontSize: "12px", fontWeight: 700, cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            {tab.emoji} {tab.label}
          </button>
        ))}
      </div>

      {/* Wisdom Mode */}
      {activeMode === "wisdom" && (
        <div style={{ padding: "20px", maxHeight: "600px", overflowY: "auto" }}>
          {!parallel ? (
            <div style={{ textAlign: "center", color: "#64748B", fontSize: "12px", padding: "40px 20px" }}>
              No historical parallels detected
            </div>
          ) : (
            <>
              <div style={{ marginBottom: "16px" }}>
                <div style={{ fontSize: "10px", color: "#D4AF37", fontWeight: 700, letterSpacing: "0.1em", marginBottom: "6px" }}>
                  HISTORICAL WISDOM
                </div>
                <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#F8FAFC", marginBottom: "12px" }}>
                  {parallel.era}
                </h3>
                <div style={{ fontSize: "12px", color: "#94A3B8", lineHeight: 1.7 }}>
                  {parallel.lesson}
                </div>
              </div>

              <div style={{ marginBottom: "16px" }}>
                <div style={{ fontSize: "10px", color: "#64748B", fontWeight: 700, marginBottom: "8px" }}>
                  SIMILAR COMPANIES:
                </div>
                {parallel.companies.filter(c => !c.toLowerCase().includes(stock.symbol.toLowerCase()) && !stock.name.toLowerCase().includes(c.toLowerCase())).map((c, i) => (
                  <div key={i} style={{
                    fontSize: "11px", color: "#94A3B8",
                    borderLeft: "2px solid rgba(212,175,55,0.3)",
                    paddingLeft: "10px", marginBottom: "6px",
                  }}>{c}</div>
                ))}
              </div>

              {relevantScores.length > 0 && (
                <div style={{ marginBottom: "16px" }}>
                  <div style={{ fontSize: "10px", color: "#64748B", fontWeight: 700, marginBottom: "8px" }}>
                    RELEVANT RISHIS:
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {relevantScores.map(s => (
                      <div key={s.name} style={{
                        padding: "4px 10px", borderRadius: "6px",
                        background: "rgba(31,41,59,0.6)", border: "1px solid rgba(51,65,85,0.4)",
                        fontSize: "11px", color: "#94A3B8",
                      }}>
                        {s.name} ({s.score})
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{
                paddingTop: "16px", borderTop: "1px solid rgba(51,65,85,0.4)",
              }}>
                <div style={{ fontSize: "10px", color: "#D4AF37", fontWeight: 700, marginBottom: "8px" }}>
                  RELATED QUOTE
                </div>
                <blockquote style={{ fontSize: "12px", fontStyle: "italic", color: "#94A3B8", lineHeight: 1.7, marginBottom: "8px" }}>
                  &quot;{parallel.quote}&quot;
                </blockquote>
                <div style={{ fontSize: "10px", color: "#64748B", textAlign: "right" }}>
                  – {parallel.author}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Chat Mode (Z5: loads on first activation) */}
      {activeMode === "chat" && (
        <WisdomChat stock={stock} scores={scores} />
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50%       { opacity: 1;   transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}