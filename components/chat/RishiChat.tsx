"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Stock } from "@/lib/types";
import { RishiScore } from "@/lib/consensus/types";
import { RISHI_PERSONALITIES, getRishisByTier, type ChatContext } from "@/lib/chat/rishiEngine";
import {
  createSession, addMessageToSession, getSessionsBySymbol,
  type ChatMessage,
} from "@/lib/chat/sessionManager";

interface Props {
  stock: Stock;
  scores: RishiScore[];
  userTier?: 'seeker' | 'student' | 'disciple';
}

const QUICK_PROMPTS = [
  "What's your view on this stock?",
  "Should I buy, hold, or sell?",
  "What are the biggest risks?",
  "Write a full investment thesis",
  "What would change your mind?",
  "Is the valuation justified?",
];

// Static fallback responses (used when API fails)
function getStaticResponse(rishiId: string, prompt: string, stock: Stock, scores: RishiScore[]): string {
  const myScore = scores.find(s => s.name.toLowerCase().includes(rishiId.slice(0, 4)));
  const score = myScore?.score ?? 50;

  const p = prompt.toLowerCase();
  const isThesis = p.includes('thesis');
  const isRisk = p.includes('risk');
  const isBuy = p.includes('buy') || p.includes('view') || p.includes('opinion');

  const LINES: Record<string, Record<string, string>> = {
    jhunjhunwala: {
      buy: score >= 70 ? `Arrey wah! ${stock.symbol} at ${score}/100 — yeh mast hai yaar! ROE ${stock.roe}%, clean sector story. Accumulate on every dip. Yeh multibagger ban sakta hai.` : `${stock.symbol} scores ${score}/100 — abhi nahi. PE ${stock.pe}x is too high for the growth on offer. Wait karo.`,
      risk: `Main risk for ${stock.symbol}: ${stock.de > 1 ? 'Debt at ' + stock.de + 'x D/E — any slowdown hurts equity hard.' : 'Execution risk — management must deliver.' } Also watch sector regulation. But long-term India story remains intact.`,
      thesis: `Jhunjhunwala Thesis — ${stock.symbol}:\n1. Score: ${score}/100\n2. ROE: ${stock.roe}% — ${stock.roe > 18 ? 'Strong' : 'Moderate'}\n3. Growth CAGR: ${stock.revcagr}%\n4. Debt: ${stock.de}x — ${stock.de < 0.5 ? 'Clean' : 'Watch'}\n5. Conviction: ${score >= 75 ? 'BUY with size on dips' : 'Watchlist'}\n\nIndia growth story intact. Patient compounding wins.`,
    },
    damani: {
      buy: score >= 70 ? `${stock.symbol} passes the sleep test at ${score}/100. ROE ${stock.roe}%, D/E ${stock.de}x. ${stock.pe < 25 ? 'Margin of safety exists at PE ' + stock.pe + 'x.' : 'Price is full — wait for better entry.'} Patience compounds.` : `${stock.symbol} at ${score}/100 does not meet my standard. ${stock.de > 0.5 ? 'Debt of ' + stock.de + 'x disturbs me.' : 'ROE ' + stock.roe + '% is insufficient.'} First rule: do not lose money.`,
      risk: `${stock.symbol} permanent loss risk: ${stock.de > 1 ? '(1) Debt refinancing in downturn' : '(1) Competitive margin erosion'}, (2) Management quality degradation, (3) Macro shock. I size positions to survive the worst.`,
      thesis: `Damani Checklist — ${stock.symbol}:\nROE ${stock.roe >= 20 ? '✓' : '✗'} (${stock.roe}%)\nDebt ${stock.de < 0.3 ? '✓' : '✗'} (${stock.de}x)\nPE ${stock.pe < 25 ? '✓' : '✗'} (${stock.pe}x)\nPromoter ${stock.promo > 50 ? '✓' : '✗'} (${stock.promo}%)\n\nVerdict: ${score >= 75 ? 'Accumulate with 5yr horizon' : 'Watchlist — await margin of safety'}.`,
    },
    buffett: {
      buy: score >= 70 ? `${stock.symbol} has a moat worth respecting — ${score}/100. ROE ${stock.roe}% over time suggests pricing power. ${stock.pe < 30 ? 'Fair price for a good business.' : 'Full price, but quality commands premium.'} Would I hold this for 10 years? ${score >= 78 ? 'Yes.' : 'Probably.'}` : `${stock.symbol} at ${score}/100 is not a wonderful business at a fair price. ${stock.roe < 15 ? 'ROE ' + stock.roe + '% suggests no durable moat.' : 'Valuation leaves no room for error.'} Better opportunities exist.`,
      risk: `Three risks for ${stock.symbol}: (1) Moat erosion from competition/tech disruption in ${stock.sector}, (2) Management capital misallocation — check buybacks vs acquisitions, (3) Valuation at PE ${stock.pe}x ${stock.pe > 30 ? 'leaves no margin of safety' : 'is reasonable'}. Promoter ${stock.promo}% ${stock.promo > 50 ? 'aligned' : 'watch'}.`,
      thesis: `Buffett Analysis — ${stock.symbol}:\nMoat: ${stock.roe >= 25 ? 'Wide' : stock.roe >= 15 ? 'Narrow' : 'Questionable'}\nOwner Earnings: ${stock.fcf > 0 ? 'Positive FCF' : 'Needs evaluation'}\nManagement: Promoter ${stock.promo}% ${stock.promo >= 50 ? '— skin in game ✓' : '— watch governance'}\nValuation: ${stock.pe < 20 ? 'Attractive' : stock.pe < 30 ? 'Fair' : 'Full'}\nVerdict: ${score >= 75 ? 'Buy and hold forever' : 'Not yet a wonderful business'}.`,
    },
    munger: {
      buy: `Invert first: what makes ${stock.symbol} a terrible investment? ${stock.de > 1.5 ? 'High debt — one bad year destroys equity.' : stock.pe > 50 ? 'Paying for perfection at PE ' + stock.pe + 'x.' : 'Competition eroding moat.'} Now the answer: ${score >= 70 ? 'Surprisingly, it avoids obvious stupidity. Score ' + score + '/100 passes.' : 'Score ' + score + '/100 — too many risks remain uninverted.'}`,
      risk: `Munger inversion for ${stock.symbol}: failure modes are (1) ${stock.sector} structural disruption nobody sees coming, (2) Incentive misalignment in management — always check options grants vs buybacks, (3) ${stock.de > 0.5 ? 'Leverage amplifying downside' : 'Complacency at good prices'}. Avoiding stupidity beats seeking brilliance.`,
      thesis: `Munger Mental Model — ${stock.symbol}:\nINVERT: Failure requires ${stock.de > 1 ? 'debt spiral' : 'moat collapse'} + ${stock.pe > 40 ? 'valuation mean reversion' : 'earnings miss'} + governance breakdown\nPROBABILITY of avoiding all: ${score >= 75 ? 'High' : 'Moderate'}\nOPPORTUNITY COST vs index: ${score >= 70 ? 'Favorable' : 'Unfavorable'}\nVERDICT: ${score >= 70 ? 'Small position — monitor intensely' : 'Avoid — better to miss than lose permanently'}.`,
    },
    chanos: {
      buy: `Short thesis check for ${stock.symbol}: Overvalued? PE ${stock.pe}x ${stock.pe > 40 ? '— YES, significantly.' : '— Reasonable.'} Deteriorating fundamentals? CAGR ${stock.revcagr}% ${stock.revcagr < 5 ? '— Slowing.' : '— Intact.'} Accounting flags? D/E ${stock.de}x ${stock.de > 2 ? '— Elevated, check footnotes.' : '— Clean.'}\nShort conviction: ${score >= 70 ? 'ZERO — this is quality, wrong side to be on.' : 'LOW-MODERATE — watchlist for catalysts.'}`,
      risk: `For ${stock.symbol} short risk (squeeze/positive catalyst): ${stock.promo > 60 ? 'High promoter holding — they can support price.' : 'Retail momentum could persist.'} Also watch for: M&A activity, regulatory approval, index inclusion. I only short when narrative is provably false AND catalyst is imminent.`,
      thesis: `Chanos Short Checklist — ${stock.symbol}:\nOvervaluation: ${stock.pe > 40 ? 'YES — PE ' + stock.pe + 'x' : 'NO'}\nFundamental Decay: ${stock.revcagr < 0 ? 'YES' : 'NO'}\nAccounting Red Flags: ${stock.de > 2 ? 'Possible — high debt' : 'Clean'}\nNarrative Gap: ${stock.pe > 40 && stock.revcagr < 10 ? 'Wide — market believes story numbers dont support' : 'Aligned'}\nShort Rating: ${score >= 75 ? 'AVOID SHORT — quality business' : score >= 50 ? 'MONITOR' : 'POTENTIAL SHORT'}.`,
    },
    lynch: {
      buy: `${stock.symbol} — is this a GARP opportunity? Growth ${stock.revcagr}%, PE ${stock.pe}x, PEG ${stock.revcagr > 0 ? (stock.pe / stock.revcagr).toFixed(1) : 'N/A'}. ${stock.pe > 0 && stock.revcagr > 0 && (stock.pe / stock.revcagr) < 1 ? 'Excellent PEG under 1 — growth cheaply priced!' : 'PEG over 1 — paying up for growth.'} Score ${score}/100. ${stock.mktcap < 50000 ? 'Still small enough to be undiscovered.' : 'Well-known — institutions already in.'}`,
      risk: `GARP risk for ${stock.symbol}: growth rate must continue to justify PE ${stock.pe}x. Watch for: competition entering ${stock.sector}, management distraction, institutional crowding ${stock.mktcap > 100000 ? '(already large cap)' : '(still manageable)'}. Best stocks are ones your neighbour doesn't know yet.`,
      thesis: `Lynch GARP Analysis — ${stock.symbol}:\nGrowth: ${stock.revcagr}% CAGR — ${stock.revcagr > 20 ? 'Tenbagger potential' : stock.revcagr > 12 ? 'Solid' : 'Moderate'}\nPE: ${stock.pe}x — ${stock.pe < 20 ? 'Cheap' : stock.pe < 30 ? 'Fair' : 'Full'}\nPEG: ${stock.revcagr > 0 ? (stock.pe / stock.revcagr).toFixed(1) : 'N/A'} — ${stock.revcagr > 0 && (stock.pe / stock.revcagr) < 1.2 ? 'Attractive' : 'Elevated'}\nDiscovery: ${stock.mktcap < 20000 ? 'Early — huge upside' : 'Late — priced in'}\nVerdict: ${score >= 70 ? 'Accumulate — GARP opportunity' : 'Wait for better price/growth combo'}.`,
    },
    soros: {
      buy: `Reflexivity lens on ${stock.symbol}: the market's belief in ${stock.sector} growth is ${score >= 70 ? 'creating a self-fulfilling cycle — stock rising attracts capital, enabling real growth, justifying higher prices. Ride the boom phase.' : 'diverging from fundamentals — narrative stronger than numbers. The reflexive reversal is coming.'}  Score ${score}/100. Macro cycle: ${stock.revcagr > 15 ? 'Early growth, tailwinds intact.' : 'Maturing, watch for regime change.'}`,
      risk: `Soros macro risks for ${stock.symbol}: (1) Central bank policy shift — RBI rate changes affect ${stock.sector} valuations, (2) Reflexive reversal — if sentiment turns, prices fall faster than fundamentals, (3) Geopolitical capital flow disruption. I size based on conviction and exit fast when wrong.`,
      thesis: `Soros Reflexivity Framework — ${stock.symbol}:\nMarket Bias: ${score >= 70 ? 'Positive feedback loop — expectations driving real growth' : 'Neutral to negative reflexivity'}\nCycle Phase: ${stock.revcagr > 20 ? 'Boom early innings' : stock.revcagr > 10 ? 'Mid cycle' : 'Late or turning'}\nPolicy Support: ${stock.sector === 'Banking' ? 'RBI-sensitive' : stock.sector === 'IT' ? 'USD-INR and US demand driven' : 'Domestic demand driven'}\nPosition: ${score >= 70 ? 'Long with trailing stop — ride the reflexive boom' : 'Neutral — wait for clear directional bias'}.`,
    },
  };

  const lines = LINES[rishiId] as Record<string, string> | undefined;
  if (!lines) return `${stock.symbol} scores ${score}/100. Ask me something specific about valuation, risks, or investment thesis.`;

  if (isThesis) return lines.thesis || lines.buy;
  if (isRisk) return lines.risk || lines.buy;
  return lines.buy;
}

export default function RishiChat({ stock, scores, userTier = 'disciple' }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [selectedRishi, setSelectedRishi] = useState("damani");
  const [debateMode, setDebateMode] = useState(false);
  const [debateRishis, setDebateRishis] = useState<[string, string]>(["jhunjhunwala", "damani"]);
  const [currentSession, setCurrentSession] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [apiStatus, setApiStatus] = useState<'idle' | 'calling' | 'ok' | 'fallback'>('idle');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const availableRishis = useMemo(() => getRishisByTier(userTier), [userTier]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const sessions = getSessionsBySymbol(stock.symbol);
    const existing = sessions.find(s => s.rishiId === selectedRishi);
    if (existing) {
      setCurrentSession(existing.id);
      setMessages(existing.messages);
    } else {
      const newSession = createSession(selectedRishi, stock.symbol, 'stock');
      setCurrentSession(newSession.id);
      setMessages([]);
    }
  }, [selectedRishi, stock.symbol]);

  const buildStockContext = useCallback((): ChatContext => ({
    symbol: stock.symbol,
    stockName: stock.name,
    sector: stock.sector,
    rishiScore: scores.find(s => s.name.toLowerCase().includes(selectedRishi.slice(0, 4)))?.score ?? 50,
    pe: stock.pe,
    roe: stock.roe,
    de: stock.de,
    revcagr: stock.revcagr,
    promo: stock.promo,
    mktcap: stock.mktcap,
    fcf: stock.fcf,
  }), [stock, scores, selectedRishi]);

  async function callGeminiAPI(
    prompt: string,
    history: ChatMessage[]
  ): Promise<string> {
    // Build message history for API
    const apiMessages = history.map(m => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      text: m.text,
    }));
    apiMessages.push({ role: 'user', text: prompt });

    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rishiId: selectedRishi,
        messages: apiMessages,
        stockContext: buildStockContext(),
        mode: 'chat',
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      if (err.fallback) throw new Error('FALLBACK');
      throw new Error(err.error || 'API error');
    }

    const data = await res.json();
    return data.text;
  }

  async function sendMessage(text: string) {
    if (!text.trim() || loading || !currentSession) return;

    setLoading(true);
    setApiStatus('calling');
    setInput("");

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      text: text.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    addMessageToSession(currentSession, userMsg);

    try {
      let responseText: string;

      if (debateMode) {
        // Debate: get both Rishis responding
        const [r1, r2] = debateRishis;
        const [resp1, resp2] = await Promise.allSettled([
          callGeminiAPI(text, messages),
          callGeminiAPI(`Respond to this from ${r2}'s perspective, potentially disagreeing: ${text}`, messages),
        ]);

        responseText = resp1.status === 'fulfilled' ? resp1.value : getStaticResponse(r1, text, stock, scores);
        const resp2Text = resp2.status === 'fulfilled' ? resp2.value : getStaticResponse(r2, text, stock, scores);

        // Add first Rishi response
        const rishi1 = RISHI_PERSONALITIES[r1];
        const msg1: ChatMessage = {
          id: Date.now().toString() + '_1',
          role: "rishi",
          rishiId: r1,
          rishiName: rishi1?.name,
          rishiEmoji: rishi1?.emoji,
          text: responseText,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, msg1]);
        addMessageToSession(currentSession, msg1);

        // Add second Rishi response after brief delay
        await new Promise(r => setTimeout(r, 500));
        const rishi2 = RISHI_PERSONALITIES[r2];
        const msg2: ChatMessage = {
          id: Date.now().toString() + '_2',
          role: "rishi",
          rishiId: r2,
          rishiName: rishi2?.name,
          rishiEmoji: rishi2?.emoji,
          text: resp2Text,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, msg2]);
        addMessageToSession(currentSession, msg2);
        setApiStatus('ok');
        setLoading(false);
        return;
      }

      // Single Rishi
      try {
        responseText = await callGeminiAPI(text, messages);
        setApiStatus('ok');
      } catch (err) {
        console.warn('[RishiChat] API failed, using static fallback:', err);
        responseText = getStaticResponse(selectedRishi, text, stock, scores);
        setApiStatus('fallback');
      }

      const rishi = RISHI_PERSONALITIES[selectedRishi];
      const rishiMsg: ChatMessage = {
        id: Date.now().toString() + '_r',
        role: "rishi",
        rishiId: selectedRishi,
        rishiName: rishi?.name,
        rishiEmoji: rishi?.emoji,
        text: responseText,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, rishiMsg]);
      addMessageToSession(currentSession, rishiMsg);

    } catch (err) {
      // Final fallback
      const responseText = getStaticResponse(selectedRishi, text, stock, scores);
      const rishi = RISHI_PERSONALITIES[selectedRishi];
      const rishiMsg: ChatMessage = {
        id: Date.now().toString() + '_r',
        role: "rishi",
        rishiId: selectedRishi,
        rishiName: rishi?.name,
        rishiEmoji: rishi?.emoji,
        text: responseText,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, rishiMsg]);
      addMessageToSession(currentSession, rishiMsg);
      setApiStatus('fallback');
    } finally {
      setLoading(false);
    }
  }

  const rishi = RISHI_PERSONALITIES[selectedRishi];

  return (
    <div style={{
      display: "flex", flexDirection: "column",
      height: "100%",
      background: "rgba(17,24,39,0.95)",
      borderRadius: "16px",
      border: "1px solid rgba(30,41,59,0.8)",
      overflow: "hidden",
    }}>

      {/* Header */}
      <div style={{
        padding: "14px 18px",
        borderBottom: "1px solid rgba(51,65,85,0.5)",
        background: "rgba(5,8,16,0.7)",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "#D4AF37", letterSpacing: "0.1em" }}>
            💬 CHAT WITH RISHIS
          </div>
          <div style={{ fontSize: "11px", color: "#64748B", marginTop: "2px" }}>
            {debateMode
              ? `⚔️ ${debateRishis.map(r => RISHI_PERSONALITIES[r]?.name).join(' vs ')}`
              : `${rishi?.emoji} ${rishi?.name} · ${apiStatus === 'ok' ? '🟢 AI' : apiStatus === 'fallback' ? '🟡 Static' : '⚡ Gemini'}`}
          </div>
        </div>
        <button
          onClick={() => setDebateMode(!debateMode)}
          style={{
            padding: "6px 12px", borderRadius: "8px", fontSize: "11px", fontWeight: 700,
            cursor: "pointer", border: "none",
            background: debateMode ? "rgba(212,175,55,0.15)" : "rgba(51,65,85,0.3)",
            color: debateMode ? "#D4AF37" : "#64748B",
          }}
        >
          {debateMode ? "⚔️ Debate" : "💬 Solo"}
        </button>
      </div>

      {/* Rishi Selector */}
      {!debateMode ? (
        <div style={{ padding: "10px 14px", borderBottom: "1px solid rgba(51,65,85,0.4)", display: "flex", gap: 6, flexWrap: "wrap" }}>
          {Object.values(RISHI_PERSONALITIES).map(r => {
            const isAvailable = availableRishis.some(ar => ar.id === r.id);
            return (
              <button
                key={r.id}
                onClick={() => isAvailable && setSelectedRishi(r.id)}
                style={{
                  padding: "5px 10px", borderRadius: "8px", fontSize: "11px", fontWeight: 600,
                  cursor: isAvailable ? "pointer" : "not-allowed",
                  border: selectedRishi === r.id ? `1px solid ${r.color}60` : "1px solid rgba(51,65,85,0.4)",
                  background: selectedRishi === r.id ? r.color + "18" : "transparent",
                  color: selectedRishi === r.id ? r.color : isAvailable ? "#64748B" : "#334155",
                  opacity: isAvailable ? 1 : 0.5,
                  display: "flex", alignItems: "center", gap: 4,
                }}
              >
                <span>{r.emoji}</span>
                <span>{r.name}</span>
                {!isAvailable && <span style={{ fontSize: 8 }}>🔒</span>}
              </button>
            );
          })}
        </div>
      ) : (
        <div style={{ padding: "10px 14px", borderBottom: "1px solid rgba(51,65,85,0.4)", display: "flex", gap: 8 }}>
          {[0, 1].map(idx => (
            <select
              key={idx}
              value={debateRishis[idx]}
              onChange={e => {
                const updated: [string, string] = [...debateRishis] as [string, string];
                updated[idx] = e.target.value;
                setDebateRishis(updated);
              }}
              style={{
                flex: 1, padding: "6px 10px", borderRadius: 8,
                background: "rgba(5,8,16,0.8)", border: "1px solid rgba(51,65,85,0.6)",
                color: "#F8FAFC", fontSize: 12, fontWeight: 700,
              }}
            >
              {Object.values(RISHI_PERSONALITIES).map(r => (
                <option key={r.id} value={r.id}>{r.emoji} {r.name}</option>
              ))}
            </select>
          ))}
        </div>
      )}

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "14px", display: "flex", flexDirection: "column", gap: "10px" }}>
        {messages.length === 0 && (
          <div style={{ textAlign: "center", color: "#475569", fontSize: "13px", marginTop: "30px" }}>
            <div style={{ fontSize: "28px", marginBottom: "10px" }}>💬</div>
            <div style={{ color: "#64748B" }}>Ask {debateMode ? "the Rishis" : rishi?.name} about {stock.symbol}</div>
            <div style={{ fontSize: 11, color: "#334155", marginTop: 6 }}>
              Powered by Google Gemini AI · Personality-driven responses
            </div>
          </div>
        )}

        {messages.map(msg => (
          <div key={msg.id} style={{ alignSelf: msg.role === "user" ? "flex-end" : "flex-start", maxWidth: "82%" }}>
            {msg.role === "rishi" && (
              <div style={{ fontSize: "10px", color: "#94A3B8", marginBottom: "3px", display: "flex", alignItems: "center", gap: 4 }}>
                <span>{msg.rishiEmoji}</span>
                <strong style={{ color: RISHI_PERSONALITIES[msg.rishiId ?? '']?.color ?? '#D4AF37' }}>
                  {msg.rishiName}
                </strong>
              </div>
            )}
            <div style={{
              background: msg.role === "user" ? "rgba(212,175,55,0.12)" : "rgba(17,24,39,0.9)",
              border: "1px solid " + (msg.role === "user" ? "rgba(212,175,55,0.25)" : "rgba(51,65,85,0.5)"),
              borderRadius: "12px", padding: "10px 14px",
              fontSize: "12px", color: "#E2E8F0", lineHeight: 1.75,
              whiteSpace: "pre-wrap", wordBreak: "break-word",
            }}>
              {msg.text}
            </div>
            <div style={{ fontSize: "9px", color: "#1E293B", marginTop: "3px", textAlign: msg.role === "user" ? "right" : "left" }}>
              {msg.timestamp.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ alignSelf: "flex-start" }}>
            <div style={{ fontSize: "10px", color: "#64748B", marginBottom: 3 }}>
              {rishi?.emoji} {rishi?.name} · thinking...
            </div>
            <div style={{
              background: "rgba(17,24,39,0.8)", border: "1px solid rgba(51,65,85,0.4)",
              borderRadius: "12px", padding: "10px 14px",
              display: "flex", alignItems: "center", gap: 8,
              color: "#64748B", fontSize: "12px",
            }}>
              <span style={{ display: "flex", gap: 3 }}>
                {[0, 1, 2].map(i => (
                  <span key={i} style={{
                    width: 6, height: 6, borderRadius: "50%", background: "#D4AF37",
                    animation: `bounce 1.2s ${i * 0.2}s infinite`,
                  }} />
                ))}
              </span>
              Consulting Gemini AI...
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts */}
      <div style={{ padding: "8px 14px", borderTop: "1px solid rgba(51,65,85,0.4)", background: "rgba(5,8,16,0.4)" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
          {QUICK_PROMPTS.map(p => (
            <button
              key={p}
              onClick={() => !loading && sendMessage(p)}
              disabled={loading}
              style={{
                padding: "4px 9px", borderRadius: "6px", fontSize: "10px",
                background: "rgba(31,41,59,0.5)", border: "1px solid rgba(51,65,85,0.4)",
                color: loading ? "#334155" : "#64748B", cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {p.length > 22 ? p.slice(0, 22) + '…' : p}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div style={{ padding: "12px 14px", borderTop: "1px solid rgba(51,65,85,0.5)", background: "rgba(5,8,16,0.7)" }}>
        <div style={{ display: "flex", gap: "8px" }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage(input)}
            placeholder={`Ask ${debateMode ? "the Rishis" : rishi?.name} about ${stock.symbol}...`}
            disabled={loading}
            style={{
              flex: 1, background: "rgba(17,24,39,0.8)",
              border: "1px solid rgba(51,65,85,0.6)", borderRadius: "8px",
              padding: "9px 12px", color: "#F8FAFC", fontSize: "12px", outline: "none",
              opacity: loading ? 0.6 : 1,
            }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            style={{
              padding: "9px 16px", borderRadius: "8px", fontWeight: 700, fontSize: "12px",
              cursor: !input.trim() || loading ? "not-allowed" : "pointer",
              background: !input.trim() || loading ? "rgba(51,65,85,0.4)" : "linear-gradient(135deg,#A88B20,#D4AF37)",
              border: "none", color: !input.trim() || loading ? "#64748B" : "#0A0F1C",
            }}
          >
            {loading ? "…" : "Send"}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  );
}