"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Stock } from "@/lib/types";
import { RishiScore } from "@/lib/consensus/types";
import { RISHI_PERSONALITIES, getRishisByTier, formatContextForPrompt, type ChatContext } from "@/lib/chat/rishiEngine";
import { 
  createSession, addMessageToSession, getSessionsBySymbol, deleteSession,
  createDebateSession, addMessageToDebate,
  type ChatMessage
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
  "Compare to sector peers",
  "What would change your mind?",
  "Analyze the balance sheet",
  "Is the valuation justified?",
];

function getRishiResponse(
  rishiId: string,
  prompt: string,
  stock: Stock,
  scores: RishiScore[],
  context: ChatContext
): string {
  const rishi = RISHI_PERSONALITIES[rishiId];
  const myScore = scores.find(s => s.name.toLowerCase() === rishiId);
  const score = myScore?.score ?? 50;

  const responses: Record<string, Record<string, string>> = {
    jhunjhunwala: {
      view: score >= 75
        ? `Arrey wah! ${stock.symbol} is the kind of stock I love — ${score}/100. Strong business, good management, and the market hasn't fully priced in the growth story yet. Yeh long-term compounder hai, yaar. ${stock.roe >= 20 ? "ROE of " + stock.roe + "% shows pricing power." : "ROE needs work, but the trajectory is right."} Accumulate on dips with conviction.`
        : `${stock.symbol} scores ${score}/100 — not convincing enough for me right now. ${stock.pe > 35 ? "Valuation is stretched at PE " + stock.pe + "x." : ""} ${stock.de > 1 ? "Debt is a concern — " + stock.de + "x D/E is risky." : ""} I wait for businesses where the odds are in my favour.`,
      risks: `Biggest risk? ${stock.de > 1 ? "Debt — at " + stock.de + "x D/E, any slowdown crushes equity value." : stock.pe > 40 ? "Valuation — PE of " + stock.pe + "x means you're paying for perfection. Any disappointment = steep fall." : "Execution — management needs to deliver consistently."} Also watch for regulatory changes in ${stock.sector}.`,
      thesis: `Investment Thesis for ${stock.symbol}:\n\n1. Business Quality: ${score >= 70 ? "Exceptional" : "Needs improvement"} — ROE ${stock.roe}%, sector ${stock.sector}\n2. Growth Runway: ${stock.revcagr >= 15 ? "Strong " + stock.revcagr + "% CAGR" : "Moderate growth"}\n3. Valuation: ${stock.pe < 25 ? "Attractive at PE " + stock.pe + "x" : "Full but justified"}\n4. Management: Promoter holding ${stock.promo}%\n5. Conviction: ${score >= 80 ? "BUY with size" : score >= 65 ? "Accumulate on dips" : "WAIT for better entry"}\n\nThis is a ${score >= 75 ? "multi-year compounder" : "watchlist candidate"}.`,
    },
    damani: {
      view: score >= 70
        ? `${stock.symbol} is a quality business — ${score}/100. The numbers speak: ROE ${stock.roe}%, debt ${stock.de}x. Current price offers ${stock.pe < 25 ? "reasonable margin of safety" : "limited downside protection — I would wait"}. Patience is the discipline here.`
        : `${stock.symbol} at ${score}/100 does not meet my standards. ${stock.roe < 15 ? "ROE of " + stock.roe + "% is insufficient." : ""} ${stock.de > 0.5 ? "Debt of " + stock.de + "x violates my preference for fortress balance sheets." : ""} I only invest where I can sleep peacefully at night.`,
      risks: `The primary risk: permanent loss of capital. For ${stock.symbol}: ${stock.de > 1 ? "(1) Debt — refinancing risk if rates rise" : stock.pe > 40 ? "(1) Valuation — mean reversion would be painful" : "(1) Competitive intensity in " + stock.sector}, (2) Management execution, (3) Macro shocks. I size positions to survive worst-case scenarios.`,
      thesis: `Damani's Checklist for ${stock.symbol}:\n\nBusiness Quality: ${stock.roe >= 20 ? "✓ PASS (ROE " + stock.roe + "%)" : "✗ MARGINAL"}\nCapital Allocation: ${stock.de < 0.3 ? "✓ PASS (Low debt)" : "✗ FAIL"}\nValuation: ${stock.pe < 25 ? "✓ PASS (PE " + stock.pe + "x)" : "✗ FAIL"}\nMargin of Safety: ${score >= 70 ? "Adequate" : "Insufficient"}\n\nVerdict: ${score >= 75 ? "Accumulate with 3-5 year horizon" : score >= 60 ? "Watchlist" : "Avoid"}. First rule: do not lose money.`,
    },
    buffett: {
      view: score >= 75
        ? `${stock.symbol} passes my primary filter — it's a good business at ${stock.pe < 30 ? "a fair price" : "a full price, but quality justifies it"}. Score ${score}/100. ${stock.roe >= 20 ? "ROE of " + stock.roe + "% suggests durable competitive advantages." : ""} Would I be happy owning this for 10 years if the market closed tomorrow? ${score >= 80 ? "Yes" : "Probably, with reservations"}.`
        : `${stock.symbol} at ${score}/100 doesn't meet the "wonderful business at a fair price" standard. ${stock.pe > 35 ? "Valuation assumes too much perfection." : ""} I prefer businesses so good that even a fool could run them.`,
      risks: `Three questions: (1) What could permanently impair this business? For ${stock.symbol}, ${stock.sector === "Banking" ? "credit cycles and regulation" : "technological disruption and competition"}. (2) Is management treating shareholders as partners? Promoter holding ${stock.promo}%. (3) What don't I know? Stay humble.`,
      thesis: `Buffett's Analysis of ${stock.symbol}:\n\nEconomic Moat: ${stock.roe >= 25 ? "Wide (ROE " + stock.roe + "%)" : stock.roe >= 15 ? "Narrow" : "Questionable"}\nPredictable Earnings: ${stock.revcagr > 0 && stock.revcagr < 15 ? "Yes" : "Uncertain"}\nOwner Earnings: ${stock.fcf ? "Strong" : "To evaluate"}\nManagement Quality: ${stock.promo >= 50 ? "Promoter has skin in game" : "Watch governance"}\nValuation: ${stock.pe < 20 ? "Attractive" : stock.pe < 30 ? "Fair" : "Full"}\n\nI buy businesses, not stocks. ${score >= 75 ? "This qualifies" : "This doesn't — yet"}.`,
    },
    munger: {
      view: `${stock.symbol} scores ${score}/100. Now invert: what would make this terrible? ${stock.de > 1.5 ? "High debt — strike one." : ""} ${stock.pe > 50 ? "Nosebleed valuation." : ""} ${stock.roe < 12 ? "Poor ROE — no pricing power." : ""} ${score >= 70 ? "Surprisingly, it passes most filters." : "As expected — most stocks don't deserve capital."}`,
      risks: `Invert the thesis. ${stock.symbol} fails if: (1) ${stock.sector} faces structural headwinds, (2) Management incentives misalign, (3) ${stock.de > 0.5 ? "Debt becomes unsustainable" : "Competition erodes margins"}. Charlie's rule: it's not brilliance that wins — it's avoiding stupidity.`,
      thesis: `Munger's Inversion Analysis:\n\nWhat must go RIGHT:\n- ${stock.sector} tailwinds continue\n- Management executes\n- No black swans\n\nWhat causes FAILURE:\n- ${stock.de > 1 ? "Debt spiral" : "Competitive pressure"}\n- ${stock.pe > 40 ? "Valuation mean reversion" : "Growth disappointment"}\n- Governance breakdown\n\nProbability of Success: ${score >= 75 ? "High" : "Moderate"}\nVerdict: ${score >= 70 ? "Small position, watch carefully" : "Better opportunities exist"}.`,
    },
    chanos: {
      view: `${stock.symbol} from a short perspective — score ${score}/100 means ${score >= 65 ? "potential short setup" : "not compelling either way"}. Overvaluation? PE ${stock.pe}x ${stock.pe > 35 ? "is elevated" : "reasonable"}. Deteriorating fundamentals? ${stock.revcagr < 5 ? "Yes" : "No"}. Accounting red flags? ${stock.de > 2 ? "Possible" : "Clean"}.`,
      risks: `For shorts: (1) Squeeze risk, (2) Black swan positive, (3) ${stock.pe < 15 ? "Already cheap — hard to short value traps" : "Momentum can stay irrational"}.`,
      thesis: `Short Thesis Checklist:\n\nOvervaluation: ${stock.pe > 40 ? "YES" : "NO"}\nFundamental Decay: ${stock.revcagr < 0 || stock.roe < 10 ? "YES" : "NO"}\nAccounting Flags: ${stock.de > 2 ? "Possible" : "Clean"}\nNarrative vs Reality Gap: ${stock.pe > 40 && stock.revcagr < 10 ? "Wide" : "Aligned"}\nCatalyst: ${score >= 70 ? "None" : "Possible"}\n\nShort Conviction: ${score >= 75 ? "ZERO — quality" : "LOW to MODERATE"}. Being early is the same as being wrong.`,
    },
    lynch: {
      view: `${stock.symbol} — is this a GARP opportunity? Growth ${stock.revcagr}%, PE ${stock.pe}x, PEG ${stock.pe && stock.revcagr > 0 ? (stock.pe / stock.revcagr).toFixed(2) : "N/A"}. ${stock.pe && stock.revcagr > 0 && stock.pe / stock.revcagr < 1 ? "Excellent — growth cheaply priced" : "Fair valuation"}. Score ${score}/100 — this is ${score >= 70 ? "an interesting story" : "not compelling enough"}.`,
      risks: `Growth-at-reasonable-price means: growth must continue. Risks: ${stock.sector} competition, macro slowdown, execution miss. But if ${stock.symbol} is still undiscovered, institution buying could be catalyst.`,
      thesis: `Lynch's GARP Analysis:\n\nGrowth Rate: ${stock.revcagr}% — ${stock.revcagr > 15 ? "Strong" : "Moderate"}\nValuation: PE ${stock.pe}x — ${stock.pe < 20 ? "Cheap" : "Fair"}\nPEG Ratio: ${stock.pe && stock.revcagr > 0 ? (stock.pe / stock.revcagr).toFixed(2) : "N/A"} — ${stock.pe && stock.revcagr > 0 && stock.pe / stock.revcagr < 1 ? "Attractive" : "Full"}\nUndiscovered: ${stock.mktcap < 50000 ? "Yes — small cap gem" : "No — well known"}\nConviction: ${score >= 70 ? "Accumulate" : "Watchlist"}\n\nGrowth at reasonable price is the sweet spot.`,
    },
    soros: {
      view: `${stock.symbol} — think macro. Market cycle stage? Economic growth? Policy shifts? ${stock.sector} sensitivity? Your score ${score}/100. From reflexivity angle: does the market expectation feed back into fundamentals positively? ${score >= 70 ? "Yes — virtuous cycle possible" : "Neutral or downside feedback loop"}. Trend? ${stock.revcagr > 20 ? "Early innings of growth" : "Maturing"}.`,
      risks: `Macro is primary risk. ${stock.sector} policy changes, capital flows, currency moves, rate cycles. The trend that looks unstoppable often stops. Monitor central banks, govt policy shifts, cross-border flows.`,
      thesis: `Soros Macro Angle:\n\nMarket Cycle: ${stock.revcagr > 20 ? "Early growth phase" : "Middle/mature"}\nReflexivity: ${score >= 70 ? "Positive feedback loop" : "Neutral"}\nPolicy Support: ${stock.sector === "Banking" ? "RBI focus" : "Sectoral support"}\nCapital Flows: ${stock.mktcap > 50000 ? "Institutional interest" : "Retail driven"}\nCatalyst Timing: ${score >= 70 ? "Next 12-18 months favorable" : "Uncertain"}\n\nMacro moves before micro. Position sizing must respect tail risks.`,
    },
  };

  const r = responses[rishiId] as Record<string, string> | undefined;
  if (!r) return `I don't have context on ${stock.symbol} yet. Ask me something specific.`;

  if (prompt.toLowerCase().includes("view") || prompt.toLowerCase().includes("opinion")) return r.view || r["thesis"];
  if (prompt.toLowerCase().includes("risk")) return r.risks || r["view"];
  if (prompt.toLowerCase().includes("thesis")) return r.thesis || r["view"];

  return r.view || `${stock.symbol} scores ${score}/100 from my perspective. What would you like to analyze?`;
}

export default function RishiChat({ stock, scores, userTier = 'seeker' }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [selectedRishi, setSelectedRishi] = useState("damani");
  const [debateMode, setDebateMode] = useState(false);
  const [debateRishis, setDebateRishis] = useState<[string, string]>(["damani", "jhunjhunwala"]);
  const [currentSession, setCurrentSession] = useState<string | null>(null);
  const [responseLoading, setResponseLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showThesisMode, setShowThesisMode] = useState(false);
  const [showExport, setShowExport] = useState(false);

  const availableRishis = useMemo(() => getRishisByTier(userTier), [userTier]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    // Load or create session
    const sessions = getSessionsBySymbol(stock.symbol);
    const stockSession = sessions.find(s => s.rishiId === selectedRishi);
    if (stockSession) {
      setCurrentSession(stockSession.id);
      setMessages(stockSession.messages);
    } else {
      const newSession = createSession(selectedRishi, stock.symbol, 'stock');
      setCurrentSession(newSession.id);
      setMessages([]);
    }
  }, [selectedRishi, stock.symbol]);

  function sendMessage(text: string) {
    if (!text.trim() || !currentSession) return;

    setResponseLoading(true);

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      text: text.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    addMessageToSession(currentSession, userMessage);
    setInput("");

    setTimeout(() => {
      const context: ChatContext = {
        symbol: stock.symbol,
        stockName: stock.name,
        sector: stock.sector,
        rishiScore: scores.find(s => s.name.toLowerCase() === selectedRishi)?.score ?? 50,
        pe: stock.pe,
        roe: stock.roe,
        de: stock.de,
        revcagr: stock.revcagr,
        promo: stock.promo,
        mktcap: stock.mktcap,
        fcf: stock.fcf,
      };

      const responseText = getRishiResponse(selectedRishi, text, stock, scores, context);
      const rishi = RISHI_PERSONALITIES[selectedRishi];

      const rishiMessage: ChatMessage = {
        id: Date.now().toString() + '_r',
        role: "rishi",
        rishiId: selectedRishi,
        rishiName: rishi?.name,
        rishiEmoji: rishi?.emoji,
        text: responseText,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, rishiMessage]);
      addMessageToSession(currentSession, rishiMessage);
      setResponseLoading(false);
    }, 600);
  }

  const rishi = RISHI_PERSONALITIES[selectedRishi];
  const isLocked = !availableRishis.some(r => r.id === selectedRishi);

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      height: "100%",
      background: "rgba(17,24,39,0.95)",
      borderRadius: "16px",
      border: "1px solid rgba(30,41,59,0.8)",
      overflow: "hidden",
    }}>

      {/* Header */}
      <div style={{
        padding: "16px 20px",
        borderBottom: "1px solid rgba(51,65,85,0.5)",
        background: "rgba(5,8,16,0.6)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}>
        <div>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "#D4AF37", letterSpacing: "0.1em" }}>
            💬 CHAT WITH RISHIS
          </div>
          <div style={{ fontSize: "12px", color: "#64748B", marginTop: "2px" }}>
            {debateMode ? `Debate: ${debateRishis.map(r => RISHI_PERSONALITIES[r]?.name || r).join(" vs ")}` : `Talking to ${rishi?.emoji} ${rishi?.name}`}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {showThesisMode && (
            <button
              onClick={() => setShowThesisMode(false)}
              style={{
                padding: "6px 12px",
                borderRadius: "8px",
                background: "rgba(212,175,55,0.15)",
                border: "1px solid rgba(212,175,55,0.4)",
                color: "#D4AF37",
                fontSize: "11px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              📄 Thesis Mode ON
            </button>
          )}
          <button
            onClick={() => setDebateMode(!debateMode)}
            style={{
              padding: "6px 12px",
              borderRadius: "8px",
              background: debateMode ? "rgba(212,175,55,0.15)" : "rgba(51,65,85,0.3)",
              border: "1px solid " + (debateMode ? "rgba(212,175,55,0.4)" : "rgba(51,65,85,0.4)"),
              color: debateMode ? "#D4AF37" : "#64748B",
              fontSize: "11px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            ⚔️ {debateMode ? "Debate ON" : "Solo"}
          </button>
        </div>
      </div>

      {/* Rishi Selector */}
      {!debateMode && (
        <div style={{ padding: "12px", borderBottom: "1px solid rgba(51,65,85,0.4)" }}>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {RISHI_PERSONALITIES.damani && Object.values(RISHI_PERSONALITIES).map(r => {
              const isAvailable = availableRishis.some(ar => ar.id === r.id);
              return (
                <button
                  key={r.id}
                  onClick={() => !isLocked && setSelectedRishi(r.id)}
                  disabled={!isAvailable}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "8px",
                    border: selectedRishi === r.id ? "1px solid " + r.color + "60" : "1px solid rgba(51,65,85,0.4)",
                    background: selectedRishi === r.id ? r.color + "18" : isAvailable ? "transparent" : "rgba(51,65,85,0.2)",
                    color: selectedRishi === r.id ? r.color : isAvailable ? "#64748B" : "#475569",
                    fontSize: "11px",
                    fontWeight: 600,
                    cursor: isAvailable ? "pointer" : "not-allowed",
                    opacity: isAvailable ? 1 : 0.5,
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                  title={!isAvailable ? `Unlock with ${r.tier === 'student' ? 'Student' : 'Disciple'} tier` : ""}
                >
                  <span>{r.emoji}</span>
                  <span>{r.name}</span>
                  {!isAvailable && <span style={{ fontSize: 8 }}>🔒</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
        {messages.length === 0 && (
          <div style={{ textAlign: "center", color: "#475569", fontSize: "13px", marginTop: "40px" }}>
            <div style={{ fontSize: "32px", marginBottom: "12px" }}>💬</div>
            <div>Ask {debateMode ? "the Rishis" : rishi?.name} anything about {stock.symbol}</div>
            <div style={{ fontSize: 11, marginTop: 8, color: "#334155" }}>Try: "Should I buy?", "Write a thesis", "Biggest risks?"</div>
          </div>
        )}

        {messages.map(msg => (
          <div key={msg.id} style={{ alignSelf: msg.role === "user" ? "flex-end" : "flex-start", maxWidth: "80%" }}>
            {msg.role === "rishi" && (
              <div style={{ fontSize: "10px", color: "#94A3B8", marginBottom: "4px", display: "flex", alignItems: "center", gap: "4px" }}>
                <span>{msg.rishiEmoji}</span>
                <strong>{msg.rishiName}</strong>
              </div>
            )}
            <div style={{
              background: msg.role === "user" ? "rgba(212,175,55,0.15)" : "rgba(17,24,39,0.8)",
              border: "1px solid " + (msg.role === "user" ? "rgba(212,175,55,0.3)" : "rgba(51,65,85,0.4)"),
              borderRadius: "12px",
              padding: "12px 14px",
              fontSize: "12px",
              color: "#E2E8F0",
              lineHeight: 1.7,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}>
              {msg.text}
            </div>
          </div>
        ))}

        {responseLoading && (
          <div style={{ alignSelf: "flex-start", maxWidth: "80%" }}>
            <div style={{
              background: "rgba(17,24,39,0.8)",
              border: "1px solid rgba(51,65,85,0.4)",
              borderRadius: "12px",
              padding: "12px 14px",
              color: "#64748B",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}>
              <span style={{ animation: "pulse 1s infinite" }}>●</span>
              {rishi?.name} is thinking...
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts */}
      <div style={{ padding: "12px", borderTop: "1px solid rgba(51,65,85,0.4)", background: "rgba(5,8,16,0.4)" }}>
        <div style={{ fontSize: "9px", color: "#475569", marginBottom: "8px", fontWeight: 700, letterSpacing: "0.1em" }}>
          QUICK PROMPTS
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
          {QUICK_PROMPTS.slice(0, 4).map(p => (
            <button
              key={p}
              onClick={() => sendMessage(p)}
              disabled={responseLoading}
              style={{
                padding: "5px 10px",
                borderRadius: "6px",
                background: "rgba(31,41,59,0.5)",
                border: "1px solid rgba(51,65,85,0.4)",
                color: responseLoading ? "#475569" : "#64748B",
                fontSize: "10px",
                cursor: responseLoading ? "not-allowed" : "pointer",
                opacity: responseLoading ? 0.5 : 1,
              }}
            >
              {p.slice(0, 20)}...
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div style={{ padding: "14px", borderTop: "1px solid rgba(51,65,85,0.5)", background: "rgba(5,8,16,0.6)" }}>
        <div style={{ display: "flex", gap: "8px" }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && sendMessage(input)}
            placeholder={`Ask ${debateMode ? "the Rishis" : rishi?.name}...`}
            disabled={responseLoading}
            style={{
              flex: 1,
              background: "rgba(17,24,39,0.8)",
              border: "1px solid rgba(51,65,85,0.6)",
              borderRadius: "8px",
              padding: "10px 12px",
              color: responseLoading ? "#475569" : "#F8FAFC",
              fontSize: "12px",
              outline: "none",
              opacity: responseLoading ? 0.5 : 1,
            }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || responseLoading}
            style={{
              padding: "10px 16px",
              borderRadius: "8px",
              background: !input.trim() || responseLoading ? "rgba(51,65,85,0.5)" : "linear-gradient(135deg,#A88B20,#D4AF37)",
              border: "none",
              color: !input.trim() || responseLoading ? "#64748B" : "#0A0F1C",
              fontWeight: 700,
              fontSize: "12px",
              cursor: !input.trim() || responseLoading ? "not-allowed" : "pointer",
            }}
          >
            {responseLoading ? "..." : "Send"}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}