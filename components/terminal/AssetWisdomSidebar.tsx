'use client';

import { useState, useRef, useEffect } from 'react';
import type { UniversalAsset } from '../../lib/types/asset';
import type { RishiScore } from '../../lib/types';
import { getUniversalParallels } from "../../lib/wisdom/universalParallels";
import { getStockParallel } from "../../lib/wisdom/stockParallels";

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
};

const RISHI_PROMPTS: Record<string, string> = {
  'Buffett': 'You are Warren Buffett analyzing this asset. Focus on moats, management, and earnings power. Keep response concise (2-3 sentences).',
  'Graham': 'You are Benjamin Graham. Calculate margin of safety. Be analytical and focused on intrinsic value.',
  'Damani': 'You are Radhakishan Damani. Ask: how much debt? Then ROCE? Then cash conversion? Be direct.',
};

interface Props {
  asset: UniversalAsset;
  scores: RishiScore[];
}

function detectArchetype(asset: UniversalAsset): string | null {
  const metadata = asset.metadata || {};
  const sector = metadata.sector || asset.sector || '';
  const roe = metadata.roe || 0;
  const pe = metadata.pe || 0;
  const de = metadata.de || 0;
  
  if (['FMCG', 'Consumer', 'Retail'].includes(sector) && roe > 20) return 'consumer_moat';
  if (['Metals', 'Energy'].includes(sector) && pe < 10 && pe > 0) return 'cyclical_value';
  
  return null;
}

export function AssetWisdomSidebar({ asset, scores }: Props) {
  const [activeMode, setActiveMode] = useState<"wisdom" | "chat">("wisdom");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [selectedRishi, setSelectedRishi] = useState(scores[0]?.name ?? "Buffett");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // °¸‚¬„¢¾ Persistent Memory: Load saved conversation on mount
  useEffect(() => {
    const storageKey = `rishi-chat-${asset.symbol}-${selectedRishi}`;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setMessages(parsed);
      } catch (e) {
        console.error('Failed to load chat history:', e);
      }
    }
  }, [asset.symbol, selectedRishi]);

  // °¸‚¬„¢¾ Auto-save conversation on every message change
  useEffect(() => {
    if (messages.length > 0) {
      const storageKey = `rishi-chat-${asset.symbol}-${selectedRishi}`;
      localStorage.setItem(storageKey, JSON.stringify(messages));
    }
  }, [messages, asset.symbol, selectedRishi]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    setError(null);
    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      text: text.trim(),
      timestamp: new Date(),
    };

  const clearChat = () => {
    setMessages([]);
    const storageKey = `rishi-chat-${asset.symbol}-${selectedRishi}`;
    localStorage.removeItem(storageKey);
  };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const stockContext = `You are analyzing ${asset.symbol} (${asset.name}).
Asset details: Price ${asset.price}, Category: ${asset.category}.
User question about this asset:`;

      const systemPrompt = (RISHI_PROMPTS[selectedRishi] || RISHI_PROMPTS['Buffett']) + '\n\n' + stockContext;

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemPrompt,
          history: messages,
          message: text.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `API error: ${res.status}`);
      }

      if (!data.text) {
        throw new Error('Empty response from AI');
      }

      const rishiMsg: Message = {
        id: Date.now().toString() + "_r",
        role: "rishi",
        rishiName: selectedRishi,
        text: data.text,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, rishiMsg]);
    } catch (err: unknown) {
      console.error('Chat error:', err);
      const errorMsg = err instanceof Error ? err.message : 'Something went wrong';
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
    const storageKey = `rishi-chat-${asset.symbol}-${selectedRishi}`;
    localStorage.removeItem(storageKey);
  };

  const archetypeKey = detectArchetype(asset);
  const stockParallel = archetypeKey ? HISTORICAL_PARALLELS[archetypeKey] : null;

  const universalList = getUniversalParallels(asset);
  const universalParallel = (!stockParallel && universalList.length > 0) ? ({
    era: `${universalList[0].title} (${universalList[0].period})`,
    lesson: universalList[0].takeaway,
    author: "Rishi Historical Archive",
    companies: [
      `Move: ${universalList[0].move}`,
      `Driver: ${universalList[0].driver}`,
      ...universalList.slice(1, 3).map(p => `Also: ${p.title} (${p.period})`),
    ],
    rishis: [],
  } as any) : null;

  const consensusScore = scores.length > 0
    ? Math.round(scores.reduce((sum, s) => sum + s.score, 0) / scores.length)
    : 50;

  const generatedStockParallel = asset.category === "stock"
    ? getStockParallel(asset, consensusScore)
    : null;

  const parallel = stockParallel ?? universalParallel ?? generatedStockParallel;

  const relevantScores = parallel ? scores.filter(s => ((parallel as any).rishis ?? []).some((r: string) => s.name === r)) : [];

  return (
    <div style={{
      background: "rgba(17,24,39,0.85)",
      border: "1px solid rgba(30,41,59,0.8)",
      borderRadius: "16px",
      overflow: "hidden",
      position: "sticky",
      top: "80px",
    }}>
      {/* Tab Switcher */}
      <div style={{
        display: "flex",
        borderBottom: "1px solid rgba(51,65,85,0.5)",
        background: "rgba(5,8,16,0.6)",
      }}>
        {[
          { id: "wisdom" as const, label: "°¸‚¬Å“€œ Wisdom", emoji: "°¸‚¬Å“€œ" },
          { id: "chat" as const, label: "°¸‚¬„¢¬ Chat", emoji: "°¸‚¬„¢¬" },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveMode(tab.id)}
            style={{
              flex: 1,
              padding: "10px",
              border: "none",
              background: activeMode === tab.id ? "rgba(212,175,55,0.1)" : "transparent",
              borderBottom: activeMode === tab.id ? "2px solid #D4AF37" : "2px solid transparent",
              color: activeMode === tab.id ? "#D4AF37" : "#64748B",
              fontSize: "12px",
              fontWeight: 700,
              cursor: "pointer",
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
                {parallel.companies.map((c: string, i: number) => (
                  <div key={i} style={{
                    fontSize: "11px",
                    color: "#94A3B8",
                    borderLeft: "2px solid rgba(212,175,55,0.3)",
                    paddingLeft: "10px",
                    marginBottom: "6px",
                  }}>
                    {c}
                  </div>
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
                        padding: "4px 10px",
                        borderRadius: "6px",
                        background: "rgba(31,41,59,0.6)",
                        border: "1px solid rgba(51,65,85,0.4)",
                        fontSize: "11px",
                        color: "#94A3B8",
                      }}>
                        {s.name} ({s.score})
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{
                paddingTop: "16px",
                borderTop: "1px solid rgba(51,65,85,0.4)",
              }}>
                <div style={{ fontSize: "10px", color: "#D4AF37", fontWeight: 700, marginBottom: "8px" }}>
                  RELATED QUOTE
                </div>
                <blockquote style={{ fontSize: "12px", fontStyle: "italic", color: "#94A3B8", lineHeight: 1.7, marginBottom: "8px" }}>
                  "{parallel.quote}"
                </blockquote>
                <div style={{ fontSize: "10px", color: "#64748B", textAlign: "right" }}>
                  ¢€š¬‚¬ {parallel.author}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Chat Mode */}
      {activeMode === "chat" && (
        <div style={{ display: "flex", flexDirection: "column", height: "500px" }}>
          {/* Chat Disclaimer */}
          <div style={{
            padding: "8px 12px",
            background: "rgba(251,191,36,0.05)",
            border: "1px solid rgba(251,191,36,0.2)",
            borderRadius: "8px",
            margin: "12px",
            fontSize: "10px",
            color: "#94A3B8",
            lineHeight: 1.5,
          }}>
            <strong style={{ color: "#FFC107" }}>Disclaimer:</strong> This chat uses AI to simulate how the selected Rishi
            might analyze investments based on publicly known philosophies. This is <strong>not</strong> real advice from the actual investor.
            For entertainment and education only.
          </div>
          {/* Rishi Selector */}
          <div style={{ padding: "12px", borderBottom: "1px solid rgba(51,65,85,0.4)" }}>
            <select
              value={selectedRishi}
              onChange={e => setSelectedRishi(e.target.value)}
              style={{
                width: "100%",
                background: "rgba(5,8,16,0.8)",
                border: "1px solid rgba(51,65,85,0.6)",
                borderRadius: "8px",
                color: "#F8FAFC",
                padding: "8px 12px",
                fontSize: "12px",
                fontWeight: 700,
              }}
            >
              {scores.slice(0, 7).map(s => (
                <option key={s.name} value={s.name}>
                  {s.full} ({s.score}/100)
                </option>
              ))}
                        
          </select>
              <button
              onClick={clearChat}
              disabled={messages.length === 0}
              style={{
                padding: "6px 12px",
                borderRadius: "6px",
                background: "rgba(239,68,68,0.1)",
                border: "1px solid rgba(239,68,68,0.3)",
                color: "#EF4444",
                fontSize: "10px",
                fontWeight: 700,
                cursor: messages.length === 0 ? "not-allowed" : "pointer",
                opacity: messages.length === 0 ? 0.4 : 1,
              }}
            >
              °¸‚¬€‚¬Ëœ¯¸ Clear
            </button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "12px", display: "flex", flexDirection: "column", gap: "10px" }}>
            {messages.length === 0 && (
              <div style={{ textAlign: "center", color: "#475569", fontSize: "11px", marginTop: "20px" }}>
                <div style={{ fontSize: "24px", marginBottom: "8px" }}>°¸‚¬„¢¬</div>
                <div>Ask {selectedRishi} about {asset.symbol}</div>
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
                  borderRadius: "10px",
                  padding: "10px 12px",
                  fontSize: "12px",
                  color: "#E2E8F0",
                  lineHeight: 1.6,
                  whiteSpace: "pre-wrap",
                }}>
                  {msg.text}
                </div>
              </div>
            ))}

            {isLoading && (
              <div style={{ alignSelf: "flex-start" }}>
                <div style={{ fontSize: "10px", color: "#64748B", marginBottom: "3px" }}>
                  {selectedRishi}
                </div>
                <div style={{
                  background: "rgba(17,24,39,0.8)",
                  border: "1px solid rgba(51,65,85,0.4)",
                  borderRadius: "10px",
                  padding: "10px 12px",
                  display: "flex",
                  gap: "4px",
                }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      background: "#D4AF37",
                      animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite`,
                    }} />
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div style={{
                alignSelf: "flex-start",
                maxWidth: "85%",
                background: "#1a0000",
                border: "1px solid #ff4444",
                borderRadius: "10px",
                padding: "10px 12px",
                fontSize: "12px",
                color: "#ff6666",
              }}>
                ¢¡ ¯¸ {error}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts */}
          <div style={{ padding: "8px", borderTop: "1px solid rgba(51,65,85,0.4)" }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginBottom: "8px" }}>
              {["What's your view?", "Biggest risks?", "Should I buy?"].map(p => (
                <button
                  key={p}
                  onClick={() => sendMessage(p)}
                  disabled={isLoading}
                  style={{
                    padding: "4px 8px",
                    borderRadius: "6px",
                    background: "rgba(31,41,59,0.5)",
                    border: "1px solid rgba(51,65,85,0.4)",
                    color: "#64748B",
                    fontSize: "10px",
                    cursor: isLoading ? "not-allowed" : "pointer",
                    opacity: isLoading ? 0.5 : 1,
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
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !isLoading && sendMessage(input)}
                disabled={isLoading}
                placeholder={`Ask ${selectedRishi}...`}
                style={{
                  flex: 1,
                  background: "rgba(17,24,39,0.8)",
                  border: "1px solid rgba(51,65,85,0.6)",
                  borderRadius: "8px",
                  padding: "8px 12px",
                  color: "#F8FAFC",
                  fontSize: "12px",
                  outline: "none",
                  opacity: isLoading ? 0.5 : 1,
                }}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={isLoading || !input.trim()}
                style={{
                  padding: "8px 16px",
                  borderRadius: "8px",
                  background: "linear-gradient(135deg,#A88B20,#D4AF37)",
                  border: "none",
                  color: "#0A0F1C",
                  fontWeight: 700,
                  fontSize: "12px",
                  cursor: isLoading || !input.trim() ? "not-allowed" : "pointer",
                  opacity: isLoading || !input.trim() ? 0.5 : 1,
                }}
              >
                {isLoading ? "..." : "Send"}
              </button>
            </div>
          </div>
        </div>
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
