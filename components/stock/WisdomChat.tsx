'use client';

// components/stock/WisdomChat.tsx — the WisdomSidebar's CHAT pane, extracted
// (Z5, Round 13) so it loads with next/dynamic on the first Chat-tab
// activation instead of shipping in every stock page's first-load JS. The
// pane is interactive-only by construction (a select + message list +
// input), so ssr:false costs nothing visible; the Wisdom tab stays static
// first-paint content.
//
// Provenance note: the end-to-end AI-loop provenance rendering (provider/
// model, grounded flag, per-claim evidence ids) moves here unchanged from
// the sidebar — never hidden (aiLoopAudit).

import { useEffect, useRef, useState } from 'react';
import { Stock, RishiScore } from '../../lib/types';

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

interface Props {
  stock: Stock;
  scores: RishiScore[];
}

export function WisdomChat({ stock, scores }: Props) {
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

  return (
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
            onKeyDown={e => e.key === 'Enter' && !isLoading && sendMessage(input)}
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
  );
}
