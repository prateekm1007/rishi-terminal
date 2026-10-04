"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { solvePow } from './pow';
import { Stock } from "@/lib/types";
import { PERSONA_DISPLAY } from "@/lib/chat/registryDisplay";
import { useLanguage } from '../../lib/language';
import {
  createSession, addMessageToSession, getSessionsBySymbol,
  type ChatMessage,
} from "@/lib/chat/sessionManager";

interface Props {
  stock: Stock;
}

// Audit 2026-10-02 (P0): the local "static fallback" answers (English and
// Hindi) were REMOVED. They generated real investment claims (scores, ROE,
// P/E, D/E, BUY/ACCUMULATE verdicts) in the browser whenever the API
// failed — a pseudo-AI loop that bypassed the server's persona
// authorization and grounding entirely. On failure the widget now shows an
// explicit unavailable state and generates NO answer (constitution rule 5:
// an honest "unavailable", never stubbed success).
//
// The persona roster the UI renders comes from the CLIENT-SAFE display
// projection (lib/chat/registryDisplay — rendering fields only). WHICH
// personas a session may use is decided by the server (G10: the canonical
// registry validation lives server-side); this component only projects
// that server answer.

export default function RishiChat({ stock }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [selectedRishi, setSelectedRishi] = useState("damani");
  const [debateMode, setDebateMode] = useState(false);
  const [debateRishis, setDebateRishis] = useState<[string, string]>(["jhunjhunwala", "damani"]);
  const [currentSession, setCurrentSession] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [apiStatus, setApiStatus] = useState<'idle' | 'calling' | 'ok' | 'unavailable'>('idle');
  const [notice, setNotice] = useState<string | null>(null);
  // A2 (Round 14): live proof-of-work progress while the challenge solves in
  // the worker — {hashes, required} where `required` is the EXPECTED work
  // (2^difficulty), a statistical denominator for the bar, not a cap.
  const [challengeProgress, setChallengeProgress] = useState<{ hashes: number; required: number } | null>(null);
  const { t } = useLanguage();

  const quickPrompts = [
    t('chat.quickPrompts.view'),
    t('chat.quickPrompts.buyHoldSell'),
    t('chat.quickPrompts.risks'),
    t('chat.quickPrompts.thesis'),
    t('chat.quickPrompts.changeMind'),
    t('chat.quickPrompts.valuation'),
  ];
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // R3 + M3 + founder decision 2026-10-02 (no sign-in required): WHICH
  // personas a caller may use is decided by the server (GET
  // /api/chat/personas serves every canonical persona to ANY caller;
  // /api/chat re-validates each id against the canonical registry per
  // request). On roster-fetch failure the fallback is the full display
  // roster — under free access there is no entitlement to compute or
  // bypass client-side, and the server still validates every POST, so a
  // wider fallback can only ever yield an honest 400/429, never an
  // unauthorized answer.
  const [allowedPersonaIds, setAllowedPersonaIds] = useState<string[]>(() =>
    PERSONA_DISPLAY.map(p => p.id),
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch('/api/chat/personas', { cache: 'no-store' });
        if (!cancelled && res.ok) {
          const data = await res.json();
          setAllowedPersonaIds((data.personas ?? []).map((p: { id: string }) => p.id));
        }
      } catch {
        // keep the full display roster as the offline fallback
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const availableRishis = useMemo(
    () => PERSONA_DISPLAY.filter(p => allowedPersonaIds.includes(p.id)),
    [allowedPersonaIds],
  );

  // Keep the selection inside the served roster (a roster refresh may
  // reorder or shrink the projection — the server stays the authority).
  useEffect(() => {
    if (allowedPersonaIds.length > 0 && !allowedPersonaIds.includes(selectedRishi)) {
      setSelectedRishi(allowedPersonaIds[0]);
    }
  }, [allowedPersonaIds]);

  // Debate pair must stay inside the authorized roster too.
  useEffect(() => {
    if (availableRishis.length < 2) return;
    const [a, b] = debateRishis;
    const ids = availableRishis.map(r => r.id);
    if (!ids.includes(a) || !ids.includes(b)) {
      setDebateRishis([ids[0], ids[1] ?? ids[0]]);
    }
  }, [availableRishis]);

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

  async function callGeminiAPI(
    personaId: string,
    prompt: string,
    history: ChatMessage[],
  ): Promise<{ text: string; provenance?: ChatMessage["provenance"] }> {
    // New contract (remediation T7): personaId + symbol — system prompt is
    // built server-side from the canonical registry; client prompt text is
    // never sent. The personaId is now an explicit parameter: the debate
    // branch used to send the SOLO selection while LABELING the reply with
    // the first debate persona (misattributed answers — fixed here).
    const post = (challenge?: { token: string; nonce: string; issuedAt: number; challengeId: string }) =>
      fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personaId,
          symbol: stock.symbol,
          history: history.map(m => ({
            role: m.role === 'user' ? 'user' : 'assistant',
            content: m.text,
          })),
          message: prompt,
          ...(challenge ? { challenge } : {}),
        }),
      });

    let res = await post();

    // X7 (Round 13): after N anonymous requests/day the server answers
    // 429 + {challengeRequired, challenge}. Solve the proof-of-work
    // (self-hosted — the cost is the requester's CPU, ~1-2 s) and retry
    // ONCE with the solution. The server consumes the challenge
    // atomically, so a replay can never help anyone else.
    if (res.status === 429) {
      const err = await res.json().catch(() => ({} as Record<string, unknown>));
      if (
        err &&
        err.challengeRequired === true &&
        err.challenge &&
        typeof (err.challenge as Record<string, unknown>).token === 'string' &&
        typeof (err.challenge as Record<string, unknown>).difficulty === 'number' &&
        typeof (err.challenge as Record<string, unknown>).challengeId === 'string' &&
        typeof (err.challenge as Record<string, unknown>).issuedAt === 'number'
      ) {
        const c = err.challenge as { token: string; difficulty: number; challengeId: string; issuedAt: number };
        // A2: the solve runs in a Web Worker with live progress and a hard
        // timeout. On timeout the worker is terminated and the human gets a
        // clear retry message (rule 3) — never a silent hang, never a
        // fabricated answer.
        setChallengeProgress({ hashes: 0, required: Math.pow(2, c.difficulty) });
        let solution: { nonce: string; hashes: number };
        try {
          solution = await solvePow(c.token, c.difficulty, p => setChallengeProgress(p));
        } finally {
          setChallengeProgress(null);
        }
        res = await post({ token: c.token, nonce: solution.nonce, issuedAt: c.issuedAt, challengeId: c.challengeId });
      } else if (err && err.fallback) {
        throw new Error('FALLBACK');
      }
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      if (err.fallback) throw new Error('FALLBACK');
      throw new Error(err.error || 'API error');
    }

    const data = await res.json();
    // End-to-end AI loop: provenance (provider/model/grounding/claims) rides
    // on the wire and is retained with the message — never hidden.
    return { text: data.text, provenance: data.provenance };
  }

  async function sendMessage(text: string) {
    if (!text.trim() || loading || !currentSession) return;

    setNotice(null);
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

    // P0 (audit 2026-10-02) + M3 (free access): validate the persona(s)
    // against the served roster BEFORE submitting (a stale local selection
    // after a roster refresh). The server still validates every POST; the
    // notice is availability wording, never an entitlement claim.
    const idsToSend = debateMode ? [...debateRishis] : [selectedRishi];
    if (idsToSend.some(id => !allowedPersonaIds.includes(id))) {
      setNotice(t('chat.personaUnavailable'));
      setApiStatus('unavailable');
      setLoading(false);
      return;
    }

    try {
      if (debateMode) {
        // Debate: both Rishis respond, each through their OWN persona.
        const [r1, r2] = debateRishis;
        const [resp1, resp2] = await Promise.allSettled([
          callGeminiAPI(r1, text, messages),
          callGeminiAPI(r2, `Respond to this from ${PERSONA_DISPLAY.find(p => p.id === r2)?.fullName}'s perspective, potentially disagreeing: ${text}`, messages),
        ]);

        if (resp1.status === 'rejected' && resp2.status === 'rejected') {
          // Both legs failed — honest unavailable state, NO pseudo-answers.
          setNotice(t('chat.aiUnavailable'));
          setApiStatus('unavailable');
          return;
        }

        const pairs: Array<[string, typeof resp1, number]> = [
          [r1, resp1, 1],
          [r2, resp2, 2],
        ];
        for (const [rid, resp, suffix] of pairs) {
          if (resp.status === 'rejected') continue;
          const persona = PERSONA_DISPLAY.find(p => p.id === rid);
          const msg: ChatMessage = {
            id: Date.now().toString() + '_' + suffix,
            role: "rishi",
            rishiId: rid,
            rishiName: persona?.name,
            rishiEmoji: persona?.emoji,
            text: resp.value.text,
            timestamp: new Date(),
            provenance: resp.value.provenance,
          };
          setMessages(prev => [...prev, msg]);
          addMessageToSession(currentSession, msg);
          if (suffix === 1) await new Promise(r => setTimeout(r, 500));
        }
        setApiStatus('ok');
      } else {
        // Single Rishi — on failure: explicit unavailable state, no answer.
        const resp = await callGeminiAPI(selectedRishi, text, messages);
        const persona = PERSONA_DISPLAY.find(p => p.id === selectedRishi);
        const rishiMsg: ChatMessage = {
          id: Date.now().toString() + '_r',
          role: "rishi",
          rishiId: selectedRishi,
          rishiName: persona?.name,
          rishiEmoji: persona?.emoji,
          text: resp.text,
          timestamp: new Date(),
          provenance: resp.provenance,
        };
        setMessages(prev => [...prev, rishiMsg]);
        addMessageToSession(currentSession, rishiMsg);
        setApiStatus('ok');
      }
    } catch (e) {
      // AI unavailable (rule 5): no fabricated answer, no pseudo-AI text.
      // A2: a timed-out/stuck challenge gets its own clear wording — the
      // generic unavailable notice would misstate what happened.
      if (e instanceof Error && e.message === 'POW_TIMEOUT') {
        console.warn('[RishiChat] chat challenge timed out — user asked to retry');
        setNotice('The security check took too long and was stopped. Please send your question again.');
        setApiStatus('unavailable');
        return;
      }
      console.warn('[RishiChat] AI unavailable — no answer generated');
      setNotice(t('chat.aiUnavailable'));
      setApiStatus('unavailable');
    } finally {
      setLoading(false);
    }
  }

  const rishi = PERSONA_DISPLAY.find(p => p.id === selectedRishi);
  const personaById = (id: string) => PERSONA_DISPLAY.find(p => p.id === id);

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
            💬 {t("chat.header")}
          </div>
          <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
            {debateMode
              ? `⚔️ ${debateRishis.map(r => personaById(r)?.name).join(' vs ')}`
              : `${rishi?.emoji} ${rishi?.name} · ${apiStatus === 'ok' ? '🟢 AI' : apiStatus === 'unavailable' ? '🔴 Unavailable' : '⚡ AI'}`}
          </div>
        </div>
        <button
          onClick={() => availableRishis.length >= 2 && setDebateMode(!debateMode)}
          disabled={availableRishis.length < 2}
          title={availableRishis.length < 2 ? t('chat.personaUnavailable') : undefined}
          style={{
            padding: "6px 12px", borderRadius: "8px", fontSize: "11px", fontWeight: 700,
            cursor: availableRishis.length >= 2 ? "pointer" : "not-allowed",
            border: "none",
            background: debateMode ? "rgba(212,175,55,0.15)" : "rgba(51,65,85,0.3)",
            color: debateMode ? "#D4AF37" : "var(--text-muted)",
            opacity: availableRishis.length >= 2 ? 1 : 0.5,
          }}
        >
          {debateMode ? "⚔️ " + t("chat.debate") : "💬 " + t("chat.solo")}
        </button>
      </div>

      {/* Rishi Selector — the client-safe display projection, authorized subset enabled */}
      {!debateMode ? (
        <div style={{ padding: "10px 14px", borderBottom: "1px solid rgba(51,65,85,0.4)", display: "flex", gap: 6, flexWrap: "wrap" }}>
          {PERSONA_DISPLAY.map(p => {
            const isAvailable = allowedPersonaIds.includes(p.id);
            return (
              <button
                key={p.id}
                onClick={() => isAvailable && setSelectedRishi(p.id)}
                title={isAvailable ? p.fullName : `${p.fullName} — ${t('chat.personaUnavailable')}`}
                style={{
                  padding: "5px 10px", borderRadius: "8px", fontSize: "11px", fontWeight: 600,
                  cursor: isAvailable ? "pointer" : "not-allowed",
                  border: selectedRishi === p.id ? `1px solid ${p.color}60` : "1px solid rgba(51,65,85,0.4)",
                  background: selectedRishi === p.id ? p.color + "18" : "transparent",
                  color: selectedRishi === p.id ? p.color : isAvailable ? "var(--text-muted)" : "var(--text-ghost)",
                  opacity: isAvailable ? 1 : 0.5,
                  display: "flex", alignItems: "center", gap: 4,
                }}
              >
                <span>{p.emoji}</span>
                <span>{p.name}</span>
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
              {availableRishis.map(p => (
                <option key={p.id} value={p.id}>{p.emoji} {p.name}</option>
              ))}
            </select>
          ))}
        </div>
      )}

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "14px", display: "flex", flexDirection: "column", gap: "10px" }}>
        {messages.length === 0 && (
          <div style={{ textAlign: "center", color: "var(--text-ghost)", fontSize: "13px", marginTop: "30px" }}>
            <div style={{ fontSize: "28px", marginBottom: "10px" }}>💬</div>
            <div style={{ color: "var(--text-muted)" }}>{t("chat.askAbout")} {debateMode ? t("chat.askTheRishis") : rishi?.name} {stock.symbol}</div>
            <div style={{ fontSize: 11, color: "#334155", marginTop: 6 }}>
              {t("chat.poweredBy")} · {t("chat.personalityDriven")}
            </div>
          </div>
        )}

        {messages.map(msg => (
          <div key={msg.id} style={{ alignSelf: msg.role === "user" ? "flex-end" : "flex-start", maxWidth: "82%" }}>
            {msg.role === "rishi" && (
              <div style={{ fontSize: "10px", color: "#94A3B8", marginBottom: "3px", display: "flex", alignItems: "center", gap: 4 }}>
                <span>{msg.rishiEmoji}</span>
                <strong style={{ color: personaById(msg.rishiId ?? '')?.color ?? '#D4AF37' }}>
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
            {/* Commit L2 (two-surface contract): when grounded, msg.text is
                the SERVER-GENERATED verified surface; the model's prose is
                commentary with NO validation state — rendered separately,
                explicitly labelled, never merged into the grounded bubble. */}
            {msg.role === "rishi" && msg.provenance?.grounded && msg.provenance.commentary && (
              <div style={{
                marginTop: 4, padding: "8px 12px",
                border: "1px dashed rgba(51,65,85,0.6)", borderRadius: "10px",
                fontSize: "11px", color: "#94A3B8", lineHeight: 1.6,
                whiteSpace: "pre-wrap", wordBreak: "break-word",
              }}>
                <div style={{ fontSize: "9px", letterSpacing: "0.08em", color: "var(--text-muted)", marginBottom: 3 }}>
                  MODEL COMMENTARY · NOT VERIFIED
                </div>
                {msg.provenance.commentary}
              </div>
            )}
            <div style={{ fontSize: "9px", color: "#1E293B", marginTop: "3px", textAlign: msg.role === "user" ? "right" : "left" }}>
              {msg.timestamp.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
            </div>
            {msg.role === "rishi" && msg.provenance && (
              <div style={{ fontSize: "9px", color: "var(--text-ghost)", marginTop: "2px", lineHeight: 1.5 }}>
                {msg.provenance.provider}/{msg.provenance.model} ·{" "}
                {msg.provenance.grounded
                  ? `cites ${msg.provenance.claims.reduce((n, c) => n + c.evidenceIds.length, 0)} evidence item${msg.provenance.claims.reduce((n, c) => n + c.evidenceIds.length, 0) === 1 ? "" : "s"} · numbers checked`
                  : "not grounded · context-only"}
                {msg.provenance.toolCalls && msg.provenance.toolCalls.length > 0 && (
                  <div>
                    · tools: {msg.provenance.toolCalls.map(tc => `${tc.tool}(${tc.symbol ?? ""})→${tc.status}`).join(", ")}
                  </div>
                )}
                {msg.provenance.grounded && msg.provenance.claims.length > 0 && (
                  <div style={{ color: "#334155" }}>
                    {msg.provenance.claims.map((c, i) => (
                      <div key={i}>· {c.claim} [{c.evidenceIds.join(", ")}]</div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div style={{ alignSelf: "flex-start" }}>
            <div style={{ fontSize: "10px", color: "var(--text-muted)", marginBottom: 3 }}>
              {rishi?.emoji} {rishi?.name} · {t("chat.thinking")}
            </div>
            <div style={{
              background: "rgba(17,24,39,0.8)", border: "1px solid rgba(51,65,85,0.4)",
              borderRadius: "12px", padding: "10px 14px",
              display: "flex", alignItems: "center", gap: 8,
              color: "var(--text-muted)", fontSize: "12px",
            }}>
              <span style={{ display: "flex", gap: 3 }}>
                {[0, 1, 2].map(i => (
                  <span key={i} style={{
                    width: 6, height: 6, borderRadius: "50%", background: "#D4AF37",
                    animation: `bounce 1.2s ${i * 0.2}s infinite`,
                  }} />
                ))}
              </span>
              {challengeProgress ? (
                // A2: live worker progress — the honest unit is hashes tried
                // against the EXPECTED work (a lucky nonce can finish early).
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <span>Proving you are human…</span>
                  <span style={{
                    display: "inline-block", width: 120, height: 4,
                    background: "rgba(51,65,85,0.8)", borderRadius: 3, overflow: "hidden",
                  }}>
                    <span style={{
                      display: "block", height: "100%",
                      width: `${Math.min(100, (challengeProgress.hashes / challengeProgress.required) * 100).toFixed(1)}%`,
                      background: "#D4AF37",
                    }} />
                  </span>
                  <span style={{ fontFamily: "monospace", fontSize: 10 }}>
                    {challengeProgress.hashes.toLocaleString()} hashes
                  </span>
                </span>
              ) : (
                t("chat.consultingAI")
              )}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Honest unavailable notice (replaces the fabricated static answers) */}
      {notice && (
        <div role="status" style={{
          margin: "0 14px 8px", padding: "8px 12px", borderRadius: 8,
          background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)",
          color: "#F87171", fontSize: 11, lineHeight: 1.5,
        }}>
          ⚠ {notice}
        </div>
      )}

      {/* Quick Prompts */}
      <div style={{ padding: "8px 14px", borderTop: "1px solid rgba(51,65,85,0.4)", background: "rgba(5,8,16,0.4)" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
          {quickPrompts.map(p => (
            <button
              key={p}
              onClick={() => !loading && sendMessage(p)}
              disabled={loading}
              style={{
                padding: "4px 9px", borderRadius: "6px", fontSize: "10px",
                background: "rgba(31,41,59,0.5)", border: "1px solid rgba(51,65,85,0.4)",
                color: loading ? "#334155" : "var(--text-muted)", cursor: loading ? "not-allowed" : "pointer",
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
            placeholder={`${t("chat.askAbout")} ${debateMode ? t("chat.askTheRishis") : rishi?.name} ${stock.symbol}...`}
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
            {loading ? "…" : t("chat.send")}
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
