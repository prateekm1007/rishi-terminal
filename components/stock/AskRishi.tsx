'use client';

/**
 * <AskRishi> (INT-D3) — the FIRST Ask Rishi affordance mount: a thin
 * one-shot composer over the EXISTING /api/chat (the A9 reference
 * contract verbatim). Mounted by the dossier ONLY when the displayed
 * artifact carries a changeKey.
 *
 * Pre-registration: docs/intelligence/stockDossier.md (PR #296).
 * Pins (enforced by test/intelligenceStockDossier.test.ts):
 *   - it fetches ONLY /api/chat (the ONE conversation endpoint — rule
 *     14: no second chat path, no new endpoint);
 *   - the request carries the BOUNDED payload exactly:
 *     { personaId, message, insightRef, symbol } — the intelligence
 *     payload is the pinned A9 triple (the deterministic 64-hex
 *     changeKey the server resolves; never an insight object, never
 *     evidence text, never prompt content) plus the route's own
 *     REQUIRED persona selector (the chat route 400s without one —
 *     resolvePersonaId(null) is null — so the dossier sends the
 *     conversation surface's own default persona id; this component
 *     invents no persona logic, no system prompt, no history replay,
 *     no captcha fields);
 *   - a refusal renders AS THE REFUSAL IT IS: the response's error
 *     text verbatim (the A9 named vocabulary: missing/stale/invalid/
 *     unauthorized reference, quota, burst, the human-verification
 *     gate, spend) — never
 *     reworded into content, never retried automatically;
 *   - a network / 5xx failure renders the honest unavailable state;
 *   - empty input disables the submit (nothing sent);
 *   - NO conversation state machine: each ask is one POST; /chat
 *     remains the full conversation surface;
 *   - no entitlement change: the route's own quota/burst/spend
 *     controls apply to every ask exactly as on /chat.
 */

import { useState } from "react";

/** The conversation surface's own default persona id — the route's
 *  required persona selector, resolved by the route's registry exactly
 *  as on /chat (no persona logic is invented here). */
const CHAT_PERSONA_ID = "damani";

const MAX_MESSAGE_CHARS = 2000; // the route's own limit — the input mirrors it

type AskState =
  | { phase: "idle" }
  | { phase: "asking" }
  | { phase: "answered"; text: string }
  | { phase: "refused"; text: string }
  | { phase: "unavailable" };

export function AskRishi({ changeKey, symbol }: { changeKey: string; symbol: string }) {
  const [question, setQuestion] = useState("");
  const [state, setState] = useState<AskState>({ phase: "idle" });

  const canSend = question.trim().length > 0 && state.phase !== "asking";

  async function ask() {
    const message = question.trim();
    if (!message || state.phase === "asking") return;
    setState({ phase: "asking" });
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          personaId: CHAT_PERSONA_ID,
          message,
          insightRef: changeKey,
          symbol,
        }),
        signal: AbortSignal.timeout(30_000),
      });
      const data = (await res.json().catch(() => null)) as
        | { answer?: unknown; error?: unknown }
        | null;
      if (!res.ok) {
        // a refusal renders AS the refusal it is — the route's named
        // error text verbatim, never reworded, never retried
        const text =
          data && typeof data.error === "string" && data.error.length > 0
            ? data.error
            : "The question could not be answered right now.";
        setState({ phase: "refused", text });
        return;
      }
      if (!data || typeof data.answer !== "string" || data.answer.length === 0) {
        setState({ phase: "unavailable" });
        return;
      }
      setState({ phase: "answered", text: data.answer });
    } catch {
      setState({ phase: "unavailable" });
    }
  }

  return (
    <div
      data-ask-rishi={state.phase}
      aria-label="Ask Rishi about this insight"
      style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
    >
      <label
        htmlFor="ask-rishi-input"
        style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary, #CBD5E1)' }}
      >
        Ask Rishi about this insight
      </label>
      <textarea
        id="ask-rishi-input"
        value={question}
        onChange={(e) => setQuestion(e.target.value.slice(0, MAX_MESSAGE_CHARS))}
        placeholder="Ask a question grounded in this insight…"
        rows={2}
        maxLength={MAX_MESSAGE_CHARS}
        style={{
          borderRadius: 8,
          border: '1px solid var(--border, #2A2F3A)',
          background: 'var(--bg-primary, #0B0E14)',
          color: 'var(--text-primary, #F8FAFC)',
          padding: '8px 10px',
          fontSize: 14,
          resize: 'vertical',
        }}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          type="button"
          onClick={ask}
          disabled={!canSend}
          style={{
            borderRadius: 8,
            border: '1px solid var(--border, #2A2F3A)',
            background: canSend ? 'var(--bg-secondary, #141925)' : 'transparent',
            color: 'var(--text-primary, #F8FAFC)',
            padding: '6px 14px',
            fontSize: 13,
            fontWeight: 600,
            cursor: canSend ? 'pointer' : 'not-allowed',
          }}
        >
          {state.phase === "asking" ? "Asking…" : "Ask"}
        </button>
        <span style={{ fontSize: 12, color: 'var(--text-muted, #64748B)' }}>
          One question per ask — the conversation lives on the Chat with Rishis page.
        </span>
      </div>
      {state.phase === "refused" && (
        <p
          role="alert"
          data-ask-rishi-refusal
          className="insight-surface__empty"
          style={{ color: 'var(--text-muted)', fontSize: 13 }}
        >
          {state.text}
        </p>
      )}
      {state.phase === "unavailable" && (
        <p
          role="alert"
          className="insight-surface__empty"
          style={{ color: 'var(--text-muted)', fontSize: 13 }}
        >
          Rishi could not be reached right now — try again on the Chat with Rishis page.
        </p>
      )}
      {state.phase === "answered" && (
        <p className="insight-surface__text" data-ask-rishi-answer style={{ fontSize: 14 }}>
          {state.text}
        </p>
      )}
    </div>
  );
}
