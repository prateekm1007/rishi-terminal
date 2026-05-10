'use client';

import { useState, useRef, useEffect } from 'react';
import { Stock, RishiScore } from '../../lib/types';

interface WisdomSidebarProps {
  stock: Stock;
  scores: RishiScore[];
}

interface Message {
  id: string;
  role: "user" | "rishi";
  rishiName?: string;
  text: string;
  timestamp: Date;
}

interface HistoricalParallel {
  companies: string[];
  era: string;
  lesson: string;
  rishis: string[];
  quote: string;
  author: string;
}

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
  if (['IT', 'Banking'].includes(sector) && roe > 15 && de < 1) return 'quality_growth';
  if (roe < 0 || de > 3) return 'turnaround';
  if (mktcap < 10000 && revcagr > 20 && roe > 15) return 'smallcap_gem';
  return null;
}

function getRishiResponse(rishiName: string, prompt: string, stock: Stock, scores: RishiScore[]): string {
  const myScore = scores.find(s => s.name === rishiName || s.full.includes(rishiName));
  const score = myScore?.score ?? 50;
  
  if (prompt.toLowerCase().includes("view") || prompt.toLowerCase().includes("opinion")) {
    return score >= 75 
      ? `${stock.symbol} scores ${score}/100 — this is exactly the kind of business I look for. ${stock.roe >= 20 ? "ROE of " + stock.roe + "% shows real competitive advantages." : ""} ${myScore?.insight ?? "Strong fundamental case."}`
      : `${stock.symbol} at ${score}/100 doesn't meet my standards yet. ${stock.de > 1 ? "Debt of " + stock.de + "x is concerning." : ""} ${stock.pe > 40 ? "Valuation is stretched." : ""} ${myScore?.insight ?? "Wait for better opportunity."}`;
  }
  
  if (prompt.toLowerCase().includes("risk")) {
    return `Primary risks for ${stock.symbol}: ${stock.de > 1 ? "(1) High debt — refinancing risk" : stock.pe > 40 ? "(1) Valuation — mean reversion risk" : "(1) Competitive intensity"}, (2) ${stock.sector} sector headwinds, (3) Management execution. Always size positions to survive worst-case scenarios.`;
  }
  
  return `${stock.symbol} scores ${score}/100 from my perspective. ${myScore?.insight ?? "Ask me something specific about valuation, risks, or thesis."}`;
}

export function WisdomSidebar({ stock, scores }: WisdomSidebarProps) {
  const [activeMode, setActiveMode] = useState<"wisdom" | "chat">("wisdom");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [selectedRishi, setSelectedRishi] = useState(scores[0]?.name ?? "Damani");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = (text: string) => {
    if (!text.trim()) return;
    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      text: text.trim(),
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);

    setTimeout(() => {
      const response = getRishiResponse(selectedRishi, text, stock, scores);
      const rishiMsg: Message = {
        id: Date.now().toString() + "_r",
        role: "rishi",
        rishiName: selectedRishi,
        text: response,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, rishiMsg]);
    }, 400);

    setInput("");
  };

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
          { id: "wisdom" as const, label: "📜 Wisdom", emoji: "📜" },
          { id: "chat" as const, label: "💬 Chat", emoji: "💬" },
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
                {parallel.companies.map((c, i) => (
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
                  "{parallel.quote}"
                </blockquote>
                <div style={{ fontSize: "10px", color: "#64748B", textAlign: "right" }}>
                  — {parallel.author}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Chat Mode */}
      {activeMode === "chat" && (
        <div style={{ display: "flex", flexDirection: "column", height: "500px" }}>
          {/* Rishi Selector */}
          <div style={{ padding: "12px", borderBottom: "1px solid rgba(51,65,85,0.4)" }}>
            <select
              value={selectedRishi}
              onChange={e => setSelectedRishi(e.target.value)}
              style={{
                width: "100%", background: "rgba(5,8,16,0.8)",
                border: "1px solid rgba(51,65,85,0.6)", borderRadius: "8px",
                color: "#F8FAFC", padding: "8px 12px", fontSize: "12px", fontWeight: 700,
              }}
            >
              {scores.slice(0, 7).map(s => (
                <option key={s.name} value={s.name}>
                  {s.full} ({s.score}/100)
                </option>
              ))}
            </select>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "12px", display: "flex", flexDirection: "column", gap: "10px" }}>
            {messages.length === 0 && (
              <div style={{ textAlign: "center", color: "#475569", fontSize: "11px", marginTop: "20px" }}>
                <div style={{ fontSize: "24px", marginBottom: "8px" }}>💬</div>
                <div>Ask {selectedRishi} about {stock.symbol}</div>
              </div>
            )}

            {messages.map(msg => (
              <div
                key={msg.id}
                style={{
                  alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                  maxWidth: "85%",
                }}
              >
                {msg.role === "rishi" && (
                  <div style={{ fontSize: "10px", color: "#64748B", marginBottom: "3px" }}>
                    {msg.rishiName}
                  </div>
                )}
                <div style={{
                  background: msg.role === "user" ? "rgba(212,175,55,0.15)" : "rgba(17,24,39,0.8)",
                  border: "1px solid " + (msg.role === "user" ? "rgba(212,175,55,0.3)" : "rgba(51,65,85,0.4)"),
                  borderRadius: "10px", padding: "10px 12px",
                  fontSize: "12px", color: "#E2E8F0", lineHeight: 1.6,
                  whiteSpace: "pre-wrap",
                }}>
                  {msg.text}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts */}
          <div style={{ padding: "8px", borderTop: "1px solid rgba(51,65,85,0.4)" }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginBottom: "8px" }}>
              {["What's your view?", "Biggest risks?", "Should I buy?"].map(p => (
                <button
                  key={p}
                  onClick={() => sendMessage(p)}
                  style={{
                    padding: "4px 8px", borderRadius: "6px",
                    background: "rgba(31,41,59,0.5)", border: "1px solid rgba(51,65,85,0.4)",
                    color: "#64748B", fontSize: "10px", cursor: "pointer",
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Input */}
          <div style={{ padding: "12px", borderTop: "1px solid rgba(51,65,85,0.5)" }}>
            <div style={{ display: "flex", gap: "8px" }}>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && sendMessage(input)}
                placeholder={`Ask ${selectedRishi}...`}
                style={{
                  flex: 1, background: "rgba(17,24,39,0.8)",
                  border: "1px solid rgba(51,65,85,0.6)", borderRadius: "8px",
                  padding: "8px 12px", color: "#F8FAFC", fontSize: "12px",
                  outline: "none",
                }}
              />
              <button
                onClick={() => sendMessage(input)}
                style={{
                  padding: "8px 16px", borderRadius: "8px",
                  background: "linear-gradient(135deg,#A88B20,#D4AF37)",
                  border: "none", color: "#0A0F1C", fontWeight: 700,
                  fontSize: "12px", cursor: "pointer",
                }}
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}