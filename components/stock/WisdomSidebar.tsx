'use client';

import { useState, useRef, useEffect } from 'react';
import { useFundamentals } from '@/hooks/useFundamentals';
import { Stock, RishiScore } from '../../lib/types';
import { getSectorOrMetricParallel, type StockParallel } from '@/lib/wisdom/stockParallels';

interface WisdomSidebarProps {
  stock: Stock;
  scores: RishiScore[];
}

interface MessageProvenance {
  provider: string;
  model: string;
  generatedAt: string;
  grounded: boolean;
  groundingMode: 'evidence-context' | 'structured-claims';
  claims: Array<{ claim: string; evidenceIds: string[] }>;
}

interface Message {
  id: string;
  role: "user" | "rishi";
  rishiName?: string;
  text: string;
  timestamp: Date;
  /** End-to-end AI loop: provenance retained + rendered — never hidden. */
  provenance?: MessageProvenance;
}

// RISHI SYSTEM PROMPTS - Same as in /rishis page


export function WisdomSidebar({ stock, scores }: WisdomSidebarProps) {
  const { fundamentals } = useFundamentals(stock.symbol);
  const pe = fundamentals?.pe ?? stock.pe;
  const roe = fundamentals?.roe ?? stock.roe;
  // H3: fundamentals.marketCap is already ₹ Cr — the ÷1e7 here corrupted
  // every screener-sourced value fed to the rishi prompts below.
  const mktcap = fundamentals?.marketCap ? fundamentals.marketCap : stock.mktcap;
  const debtToEquity = fundamentals?.debtToEquity ?? stock.de;
  const revCagr = fundamentals?.revCagr3y ?? stock.revcagr;
  const promoter = fundamentals?.promoterHolding ?? stock.promo;
  const [activeMode, setActiveMode] = useState<"wisdom" | "chat">("wisdom");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [selectedRishi, setSelectedRishi] = useState(scores[0]?.name ?? "Damani");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      // personaId + symbol only — the system prompt is built server-side
      // from the allow-list (remediation T7).
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personaId: selectedRishi,
          symbol: stock.symbol,
          history: messages.map(m => ({
            role: m.role === 'user' ? 'user' : 'assistant',
            content: m.text,
          })),
          message: text.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `API error: ${res.status}`);
      }

      if (!data.text) {
        throw new Error('Empty response from Gemini');
      }

      const rishiMsg: Message = {
        id: Date.now().toString() + "_r",
        role: "rishi",
        rishiName: selectedRishi,
        text: data.text,
        timestamp: new Date(),
        provenance: (data.provenance ?? undefined) as MessageProvenance | undefined,
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

  // Y4 (Round 12): the analog is selected by SECTOR (then metrics) from
  // the one sector-parallel table the AI surface uses
  // (lib/wisdom/stockParallels, Rule 14) — or not shown at all. The old
  // seed-metric archetype matcher put the "India Services Export Boom"
  // IT-era card on SBIN (a bank) because its seed de < 1 matched a
  // "quality growth" archetype.
  const parallel: StockParallel | null = getSectorOrMetricParallel(stock.sector, {
    roe: roe,
    pe: pe,
    de: debtToEquity,
    revcagr: revCagr,
  });
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
                {msg.role === "rishi" && msg.provenance && (
                  <div style={{
                    fontSize: "9px", color: "#64748B", marginTop: "3px", lineHeight: 1.5,
                  }}>
                    {msg.provenance.provider}/{msg.provenance.model} ·{" "}
                    {msg.provenance.grounded
                      ? `cites ${msg.provenance.claims.reduce((n, c) => n + c.evidenceIds.length, 0)} evidence item${msg.provenance.claims.reduce((n, c) => n + c.evidenceIds.length, 0) === 1 ? "" : "s"} · numbers checked`
                      : "not grounded · context-only"}
                    {msg.provenance.grounded && msg.provenance.claims.length > 0 && (
                      <div style={{ color: "#475569" }}>
                        {msg.provenance.claims.map((c, i) => (
                          <div key={i}>· {c.claim} [{c.evidenceIds.join(", ")}]</div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div style={{ alignSelf: "flex-start" }}>
                <div style={{ fontSize: "10px", color: "#64748B", marginBottom: "3px" }}>
                  {selectedRishi}
                </div>
                <div style={{
                  background: "rgba(17,24,39,0.8)", border: "1px solid rgba(51,65,85,0.4)",
                  borderRadius: "10px", padding: "10px 12px", display: "flex", gap: "4px",
                }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{
                      width: "6px", height: "6px", borderRadius: "50%", background: "#D4AF37",
                      animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite`,
                    }} />
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div style={{
                alignSelf: "flex-start", maxWidth: "85%",
                background: "#1a0000", border: "1px solid #ff4444",
                borderRadius: "10px", padding: "10px 12px",
                fontSize: "12px", color: "#ff6666",
              }}>
                ⚠️ {error}
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
                    padding: "4px 8px", borderRadius: "6px",
                    background: "rgba(31,41,59,0.5)", border: "1px solid rgba(51,65,85,0.4)",
                    color: "#64748B", fontSize: "10px", cursor: isLoading ? "not-allowed" : "pointer",
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
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !isLoading && sendMessage(input)}
                disabled={isLoading}
                placeholder={`Ask ${selectedRishi}...`}
                style={{
                  flex: 1, background: "rgba(17,24,39,0.8)",
                  border: "1px solid rgba(51,65,85,0.6)", borderRadius: "8px",
                  padding: "8px 12px", color: "#F8FAFC", fontSize: "12px",
                  outline: "none", opacity: isLoading ? 0.5 : 1,
                }}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={isLoading || !input.trim()}
                style={{
                  padding: "8px 16px", borderRadius: "8px",
                  background: "linear-gradient(135deg,#A88B20,#D4AF37)",
                  border: "none", color: "#0A0F1C", fontWeight: 700,
                  fontSize: "12px", cursor: isLoading || !input.trim() ? "not-allowed" : "pointer",
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