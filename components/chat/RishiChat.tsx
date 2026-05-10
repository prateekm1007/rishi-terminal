"use client";

import { useState, useRef, useEffect } from "react";
import { Stock } from "@/lib/types";
import { RishiScore } from "@/lib/consensus/types";

interface Message {
  id: string;
  role: "user" | "rishi";
  rishiName?: string;
  rishiEmoji?: string;
  text: string;
  timestamp: Date;
}

interface Props {
  stock: Stock;
  scores: RishiScore[];
}

const RISHIS = [
  { id:"jhunjhunwala", name:"Jhunjhunwala", emoji:"🦁", color:"#F59E0B" },
  { id:"damani",       name:"Damani",       emoji:"🧘", color:"#D4AF37" },
  { id:"buffett",      name:"Buffett",      emoji:"🎩", color:"#22C55E" },
  { id:"munger",       name:"Munger",       emoji:"🦉", color:"#8B5CF6" },
  { id:"chanos",       name:"Chanos",       emoji:"🐻", color:"#EF4444" },
  { id:"lynch",        name:"Lynch",        emoji:"🚀", color:"#06B6D4" },
  { id:"soros",        name:"Soros",        emoji:"🌊", color:"#A78BFA" },
];

const QUICK_PROMPTS = [
  "What's your view on this stock?",
  "Should I buy, hold, or sell?",
  "What are the biggest risks?",
  "Write a full investment thesis",
  "Compare to sector peers",
  "What would change your mind?",
];

// ── Static Responses (no API needed) ──────────────────────────

function getRishiResponse(rishiId: string, prompt: string, stock: Stock, scores: RishiScore[]): string {
  const myScore = scores.find(s => s.name.toLowerCase() === rishiId);
  const score = myScore?.score ?? 50;
  const sector = stock.sector;

  const RESPONSES: Record<string, Record<string, string>> = {
    jhunjhunwala: {
      "view": score >= 75 
        ? `Arrey wah! ${stock.symbol} is the kind of stock I love — ${score}/100. Strong business, good management, and the market hasn't fully priced in the growth story yet. Yeh long-term compounder hai, yaar. ${stock.roe >= 20 ? "ROE of " + stock.roe + "% shows pricing power." : "ROE needs work, but the trajectory is right."} Accumulate on dips with conviction.`
        : `${stock.symbol} scores ${score}/100 — not convincing enough for me right now. ${stock.pe > 35 ? "Valuation is stretched at PE " + stock.pe + "x." : ""} ${stock.de > 1 ? "Debt is a concern — " + stock.de + "x D/E is risky." : ""} I wait for businesses where the odds are in my favour. This isn't there yet, samajh rahe ho?`,
      "risks": `Biggest risk? ${stock.de > 1 ? "Debt — at " + stock.de + "x D/E, any slowdown crushes equity value." : stock.pe > 40 ? "Valuation — PE of " + stock.pe + "x means you're paying for perfection. Any disappointment = steep fall." : "Execution — management needs to deliver consistently."} Also watch for regulatory changes in ${sector} and macro headwinds. But if you believe in India's growth, short-term volatility is noise.`,
      "thesis": `Investment Thesis for ${stock.symbol} (Jhunjhunwala Style):\n\n1. Business Quality: ${score >= 70 ? "Exceptional" : "Needs improvement"} — ROE ${stock.roe}%, sector ${sector}\n2. Growth Runway: ${stock.revcagr >= 15 ? "Strong " + stock.revcagr + "% CAGR shows market share gains" : "Moderate growth, but defendable franchise"}\n3. Valuation: ${stock.pe < 25 ? "Attractive at PE " + stock.pe + "x" : "Full but justified by quality"}\n4. Management: Promoter holding ${stock.promo}% ${stock.promo > 50 ? "— skin in the game" : "— watch for alignment"}\n5. Conviction: ${score >= 80 ? "BUY with size" : score >= 65 ? "Accumulate on dips" : "WAIT for better entry"}\n\nThis is a ${score >= 75 ? "multi-year compounder" : "watchlist candidate"}. Market mein jaldi nahi hai — patience wins.`,
    },
    damani: {
      "view": score >= 70
        ? `${stock.symbol} is a quality business — ${score}/100. The numbers speak: ROE ${stock.roe}%, debt ${stock.de}x. ${stock.roe >= 20 && stock.de < 0.5 ? "This is the kind of predictable compounder I seek." : "Acceptable, but I prefer even cleaner balance sheets."} Current price offers ${stock.pe < 25 ? "reasonable margin of safety" : "limited downside protection — I would wait"}. Patience is the discipline here.`
        : `${stock.symbol} at ${score}/100 does not meet my standards. ${stock.roe < 15 ? "ROE of " + stock.roe + "% is insufficient." : ""} ${stock.de > 0.5 ? "Debt of " + stock.de + "x violates my preference for fortress balance sheets." : ""} I only invest where I can sleep peacefully at night. This is not that business.`,
      "risks": `The primary risk is always: what can cause permanent loss of capital? For ${stock.symbol}: ${stock.de > 1 ? "(1) Debt — refinancing risk if rates rise" : stock.pe > 40 ? "(1) Valuation — mean reversion would be painful" : "(1) Competitive intensity in " + sector}, (2) ${stock.promo < 30 ? "Low promoter holding — incentive misalignment" : "Management execution — past is not always prologue"}, (3) Macro shocks we cannot predict. I size positions to survive worst-case scenarios.`,
      "thesis": `Damani's Checklist for ${stock.symbol}:\n\n✓ Business Quality: ${stock.roe >= 20 ? "PASS (ROE " + stock.roe + "%)" : "MARGINAL (ROE " + stock.roe + "%)"}\n✓ Capital Allocation: ${stock.de < 0.3 ? "PASS (Low debt)" : "FAIL (Debt " + stock.de + "x)"}\n✓ Valuation: ${stock.pe < 25 ? "PASS (PE " + stock.pe + "x)" : "FAIL (Too expensive)"}\n✓ Predictability: ${stock.revcagr > 0 && stock.revcagr < 20 ? "PASS (Steady growth)" : "UNCERTAIN"}\n✓ Margin of Safety: ${score >= 70 ? "Adequate" : "Insufficient"}\n\nVerdict: ${score >= 75 ? "Accumulate with 3-5 year horizon" : score >= 60 ? "Watchlist — await better entry" : "Avoid — capital has better opportunities"}. Remember: the first rule is do not lose money.`,
    },
    buffett: {
      "view": score >= 75
        ? `${stock.symbol} passes my primary filter — it's a good business at ${stock.pe < 30 ? "a fair price" : "a full price, but quality justifies it"}. Score ${score}/100. ${stock.roe >= 20 ? "ROE of " + stock.roe + "% suggests durable competitive advantages." : "ROE is okay but not outstanding."} I ask: would I be happy owning this for 10 years if the market closed tomorrow? ${score >= 80 ? "Yes" : "Probably, with some reservations"}. The key is whether management allocates capital wisely.`
        : `${stock.symbol} at ${score}/100 doesn't meet the "wonderful business at a fair price" standard. ${stock.pe > 35 ? "Valuation assumes too much perfection." : ""} ${stock.roe < 15 ? "ROE of " + stock.roe + "% suggests no real moat." : ""} I prefer businesses so good that even a fool could run them — because eventually, one will. I don't see that here yet.`,
      "risks": `Three questions I ask: (1) What could permanently impair this business? For ${stock.symbol}, ${sector === "Banking" ? "credit cycles and regulation" : sector === "Pharma" ? "patent cliffs and regulatory action" : "technological disruption and competition"}. (2) Is management treating shareholders as partners? Promoter holding ${stock.promo}% ${stock.promo > 40 ? "— good alignment" : "— watch for self-dealing"}. (3) What don't I know? In investing, it's not what you know — it's what you're certain about that ain't so. Stay humble.`,
      "thesis": `Buffett's Analysis of ${stock.symbol}:\n\n1. Economic Moat: ${stock.roe >= 25 ? "Wide (ROE " + stock.roe + "%)" : stock.roe >= 15 ? "Narrow" : "Questionable"}\n2. Predictable Earnings: ${stock.revcagr > 0 && stock.revcagr < 15 ? "Yes — boring is beautiful" : "Uncertain"}\n3. Owner Earnings: ${stock.fcf > 0 ? "Real free cash flow of " + stock.fcf + " Cr" : "Negative — red flag"}\n4. Management Quality: ${stock.promo >= 50 ? "Promoter has skin in game" : "Watch governance closely"}\n5. Valuation: ${stock.pe < 20 ? "Attractive" : stock.pe < 30 ? "Fair" : "Full"}\n\nI buy businesses, not stocks. ${score >= 75 ? "This qualifies" : "This doesn't — yet"}. Time is the friend of wonderful businesses, enemy of mediocre ones.`,
    },
    munger: {
      "view": `${stock.symbol} scores ${score}/100. Now let's invert: what would make this a terrible investment? ${stock.de > 1.5 ? "High debt — that's already a strike." : ""} ${stock.pe > 50 ? "Nosebleed valuation — paying for a dream, not reality." : ""} ${stock.roe < 12 ? "Poor ROE — no pricing power." : ""} ${score >= 70 ? "Surprisingly, it passes most filters. Rare." : "As expected — most stocks don't deserve capital."} The question is not "Can this work?" but "How does this fail?" I see ${score >= 70 ? "manageable" : "unacceptable"} downside.`,
      "risks": `Invert the thesis: ${stock.symbol} fails if: (1) ${sector} faces structural headwinds (tech disruption, regulation), (2) Management incentives misalign (watch for aggressive accounting — always a precursor to fraud), (3) ${stock.de > 0.5 ? "Debt becomes unsustainable in downturn" : "Competition erodes margins — no moat means commoditization"}. Charlie's rule: it's not brilliance that wins — it's avoiding stupidity. This ${score >= 65 ? "avoids obvious stupidity" : "has too many red flags"}.`,
      "thesis": `Munger's Inversion Analysis:\n\nWhat must go RIGHT for ${stock.symbol} to win:\n- ${sector} tailwinds continue\n- Management executes flawlessly\n- No black swans (regulation, tech, macro)\n\nWhat will cause FAILURE:\n- ${stock.de > 1 ? "Debt spiral in recession" : "Competitive intensity crushes margins"}\n- ${stock.pe > 40 ? "Valuation mean reversion" : "Growth disappointment"}\n- Governance breakdown (always possible)\n\nProbability of Success: ${score >= 75 ? "High" : score >= 60 ? "Moderate" : "Low"}\nExpected Utility: ${score >= 70 ? "Positive with patience" : "Negative — avoid"}\n\nAdvice: ${score >= 70 ? "Small position, watch like a hawk" : "Better opportunities exist — opportunity cost matters"}.`,
    },
    chanos: {
      "view": `${stock.symbol} from a short perspective — score ${score}/100 means ${score >= 65 ? "potential short setup" : "not compelling either way"}. I look for: (1) Overvaluation — PE ${stock.pe}x ${stock.pe > 35 ? "is elevated" : "is reasonable"}, (2) Deteriorating fundamentals — ${stock.revcagr < 5 ? "revenue growth slowing" : "growth okay"}, (3) Accounting red flags — ${stock.de > 2 ? "high debt suggests aggressive expansion" : "balance sheet clean"}. ${score >= 70 ? "This is NOT a short — too much quality" : "Watchlist for structural issues"}.`,
      "risks": `For shorts, the risks are different: (1) Squeeze risk — if ${stock.promo > 60 ? "promoter can support stock" : "retail piles in on hope"}, (2) Black swan positive — sudden regulatory approval, M&A, etc., (3) ${stock.pe < 15 ? "Already cheap — hard to make money shorting value traps" : "Momentum can stay irrational longer than you can stay solvent"}. I only short when narrative is provably false AND catalyst is near. ${stock.symbol} ${score >= 70 ? "doesn't qualify" : "has potential but timing unclear"}.`,
      "thesis": `Chanos Short Thesis Check:\n\n1. Overvaluation: ${stock.pe > 40 ? "YES — PE " + stock.pe + "x unsustainable" : "NO"}\n2. Fundamental Decay: ${stock.revcagr < 0 || stock.roe < 10 ? "YES — deteriorating" : "NO"}\n3. Accounting Flags: ${stock.de > 2 ? "Possible — high debt" : "Clean"}\n4. Narrative Divergence: ${stock.pe > 40 && stock.revcagr < 10 ? "Market believes growth story that numbers don't support" : "Narrative matches reality"}\n5. Catalyst: ${score >= 70 ? "None — avoid" : "Earnings miss, regulation, macro shock"}\n\nShort Conviction: ${score >= 75 ? "ZERO — this is quality, wrong side" : score >= 60 ? "LOW" : score >= 40 ? "MODERATE" : "HIGH"}. Remember: being early and being wrong are the same thing in shorting.`,
    },
  };

  const r = RESPONSES[rishiId];
  if (!r) return `I don't have enough context on ${stock.symbol} yet. Ask me something specific.`;

  if (prompt.includes("view") || prompt.includes("opinion")) return r.view || r["view"];
  if (prompt.includes("risk")) return r.risks || r["risks"];
  if (prompt.includes("thesis")) return r.thesis || r["thesis"];

  return r.view || `${stock.symbol} scores ${score}/100 from my lens. What specific aspect would you like me to analyze?`;
}

// ── Component ──────────────────────────────────────────────────

export default function RishiChat({ stock, scores }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [selectedRishi, setSelectedRishi] = useState("damani");
  const [debateMode, setDebateMode] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const rishi = RISHIS.find(r => r.id === selectedRishi)!;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = (text: string) => {
    if (!text.trim()) return;

    // User message
    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      text: text.trim(),
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);

    // Rishi response
    setTimeout(() => {
      if (debateMode) {
        // Multi-Rishi debate
        const rishis = RISHIS.slice(0, 3);
        rishis.forEach((r, i) => {
          setTimeout(() => {
            const response = getRishiResponse(r.id, text, stock, scores);
            const rishiMsg: Message = {
              id: Date.now().toString() + "_" + i,
              role: "rishi",
              rishiName: r.name,
              rishiEmoji: r.emoji,
              text: response,
              timestamp: new Date(),
            };
            setMessages(prev => [...prev, rishiMsg]);
          }, i * 800);
        });
      } else {
        const response = getRishiResponse(selectedRishi, text, stock, scores);
        const rishiMsg: Message = {
          id: Date.now().toString() + "_r",
          role: "rishi",
          rishiName: rishi.name,
          rishiEmoji: rishi.emoji,
          text: response,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, rishiMsg]);
      }
    }, 400);

    setInput("");
  };

  return (
    <div style={{
      display: "flex", flexDirection: "column", height: "600px",
      background: "linear-gradient(135deg,rgba(17,24,39,0.95),rgba(10,15,28,0.98))",
      border: "1px solid rgba(212,175,55,0.2)", borderRadius: "20px",
      overflow: "hidden",
    }}>

      {/* Header */}
      <div style={{
        padding: "16px 20px", borderBottom: "1px solid rgba(51,65,85,0.5)",
        background: "rgba(5,8,16,0.6)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: "11px", fontWeight: 700, color: "#D4AF37", letterSpacing: "0.1em" }}>
              💬 CHAT WITH RISHIS
            </div>
            <div style={{ fontSize: "12px", color: "#64748B", marginTop: "2px" }}>
              {debateMode ? "Debate Mode — 3 Rishis" : `Talking to ${rishi.emoji} ${rishi.name}`}
            </div>
          </div>
          <button
            onClick={() => setDebateMode(!debateMode)}
            style={{
              padding: "6px 12px", borderRadius: "8px",
              background: debateMode ? "rgba(212,175,55,0.15)" : "rgba(51,65,85,0.3)",
              border: "1px solid " + (debateMode ? "rgba(212,175,55,0.4)" : "rgba(51,65,85,0.4)"),
              color: debateMode ? "#D4AF37" : "#64748B",
              fontSize: "11px", fontWeight: 700, cursor: "pointer",
            }}
          >
            {debateMode ? "⚔️ Debate ON" : "💬 Solo"}
          </button>
        </div>
      </div>

      {/* Rishi Selector */}
      {!debateMode && (
        <div style={{ padding: "12px", borderBottom: "1px solid rgba(51,65,85,0.4)" }}>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {RISHIS.map(r => (
              <button
                key={r.id}
                onClick={() => setSelectedRishi(r.id)}
                style={{
                  padding: "6px 12px", borderRadius: "8px",
                  border: selectedRishi === r.id ? "1px solid " + r.color + "60" : "1px solid rgba(51,65,85,0.4)",
                  background: selectedRishi === r.id ? r.color + "18" : "transparent",
                  color: selectedRishi === r.id ? r.color : "#64748B",
                  fontSize: "12px", fontWeight: 600, cursor: "pointer",
                  display: "flex", alignItems: "center", gap: "4px",
                }}
              >
                <span>{r.emoji}</span>
                <span>{r.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
        {messages.length === 0 && (
          <div style={{ textAlign: "center", color: "#475569", fontSize: "13px", marginTop: "40px" }}>
            <div style={{ fontSize: "32px", marginBottom: "12px" }}>💬</div>
            <div>Ask the Rishis anything about {stock.symbol}</div>
          </div>
        )}

        {messages.map(msg => (
          <div
            key={msg.id}
            style={{
              alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
              maxWidth: "75%",
            }}
          >
            {msg.role === "rishi" && (
              <div style={{ fontSize: "11px", color: "#64748B", marginBottom: "4px", display: "flex", alignItems: "center", gap: "4px" }}>
                <span>{msg.rishiEmoji}</span>
                <span>{msg.rishiName}</span>
              </div>
            )}
            <div style={{
              background: msg.role === "user" ? "rgba(212,175,55,0.15)" : "rgba(17,24,39,0.8)",
              border: "1px solid " + (msg.role === "user" ? "rgba(212,175,55,0.3)" : "rgba(51,65,85,0.4)"),
              borderRadius: "12px", padding: "12px 14px",
              fontSize: "13px", color: "#E2E8F0", lineHeight: 1.7,
              whiteSpace: "pre-wrap",
            }}>
              {msg.text}
            </div>
            <div style={{ fontSize: "10px", color: "#334155", marginTop: "4px" }}>
              {msg.timestamp.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts */}
      <div style={{ padding: "12px", borderTop: "1px solid rgba(51,65,85,0.4)", background: "rgba(5,8,16,0.4)" }}>
        <div style={{ fontSize: "10px", color: "#475569", marginBottom: "8px", fontWeight: 700, letterSpacing: "0.08em" }}>
          QUICK PROMPTS
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          {QUICK_PROMPTS.map(p => (
            <button
              key={p}
              onClick={() => sendMessage(p)}
              style={{
                padding: "5px 10px", borderRadius: "6px",
                background: "rgba(31,41,59,0.5)", border: "1px solid rgba(51,65,85,0.4)",
                color: "#64748B", fontSize: "11px", cursor: "pointer",
              }}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div style={{ padding: "16px", borderTop: "1px solid rgba(51,65,85,0.5)", background: "rgba(5,8,16,0.6)" }}>
        <div style={{ display: "flex", gap: "10px" }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && sendMessage(input)}
            placeholder={`Ask ${debateMode ? "the Rishis" : rishi.name}...`}
            style={{
              flex: 1, background: "rgba(17,24,39,0.8)",
              border: "1px solid rgba(51,65,85,0.6)", borderRadius: "10px",
              padding: "10px 14px", color: "#F8FAFC", fontSize: "13px",
              outline: "none",
            }}
          />
          <button
            onClick={() => sendMessage(input)}
            style={{
              padding: "10px 20px", borderRadius: "10px",
              background: "linear-gradient(135deg,#A88B20,#D4AF37)",
              border: "none", color: "#0A0F1C", fontWeight: 700,
              fontSize: "13px", cursor: "pointer",
            }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}