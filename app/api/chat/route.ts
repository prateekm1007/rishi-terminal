import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { resolvePersonaId, CHAT_PERSONAS } from '@/lib/chat/personas';
import { STOCKS } from '@/data/stocks';

import { OpenAIChatResponseSchema, GeminiResponseSchema, parseUpstream } from '@/lib/schemas/upstream';
import { consumeIpBudget, clientIpFromHeaders } from '@/lib/ratelimit/persistent';
/**
 * POST /api/chat — hardened LLM proxy (remediation T7; provider-extended).
 *
 * Contract: { personaId, symbol?, history, message }
 * - Session required (401 otherwise; UI serves canned fallbacks locally).
 * - The system prompt is built SERVER-SIDE from a persona allow-list —
 *   a client-supplied systemPrompt is not part of the contract and is
 *   ignored/rejected.
 * - symbol is validated against the stock seed registry before use.
 * - Limits: message <= 2000 chars; history <= 20 turns and <= 8000 chars
 *   total; roles restricted to user|assistant.
 * - Quotas: per-user daily quota by tier (Supabase chat_usage) plus a
 *   per-IP burst limit.
 * - Providers (resolved per request from env):
 *     1. OpenAI-compatible endpoint — CHAT_API_BASE_URL + CHAT_API_KEY
 *        (+ optional CHAT_MODEL). The key is sent via the
 *        `Authorization: Bearer` header, never the URL.
 *     2. Google Gemini fallback — GEMINI_API_KEY, key via the
 *        `x-goog-api-key` header, never the URL.
 * - Upstream error details are logged server-side; clients get generic
 *   messages (no `details`, no `raw`).
 * - Prompt-injection hygiene: user text only ever enters `user` turns.
 */

const GEMINI_MODEL = 'models/gemini-2.5-flash';
const DEFAULT_OPENAI_MODEL = 'agnes-2.5-flash';

type OpenAiCompatibleProvider = {
  kind: 'openai';
  baseUrl: string;
  apiKey: string;
  model: string;
};

type GeminiProvider = { kind: 'gemini'; apiKey: string };

type ChatProvider = OpenAiCompatibleProvider | GeminiProvider;

/**
 * Resolve the upstream chat provider from env at request time (so a
 * deployment can switch providers without a code change). The
 * OpenAI-compatible endpoint wins when both are configured; fail closed to
 * `null` when neither is present.
 */
function resolveChatProvider(): ChatProvider | null {
  const baseUrl = (process.env.CHAT_API_BASE_URL || '')
    .trim()
    .replace(/\/+$/, '')
    .replace(/\/chat\/completions$/, '');
  const chatKey = (process.env.CHAT_API_KEY || '').trim();
  if (baseUrl && chatKey) {
    return {
      kind: 'openai',
      baseUrl,
      apiKey: chatKey,
      model: (process.env.CHAT_MODEL || '').trim() || DEFAULT_OPENAI_MODEL,
    };
  }
  const geminiKey = (process.env.GEMINI_API_KEY || '').trim();
  if (geminiKey) return { kind: 'gemini', apiKey: geminiKey };
  return null;
}

const MAX_MESSAGE_CHARS = 2000;
const MAX_HISTORY_TURNS = 20;
const MAX_HISTORY_CHARS = 8000;

// Daily chat quota by tier (documented choice; seeker free tier is modest).
const DAILY_QUOTA: Record<string, number> = {
  seeker: 15,
  student: 150,
  disciple: 500,
};

// ── per-IP burst limiter (R6: persistent Postgres counter) ─────
// The previous in-memory Map had one bucket per serverless instance —
// effectively no limit. consumeIpBudget() shares one counter across
// instances via the atomic consume_ip_budget RPC (migration 008).

// ── per-user daily quota (R6: atomic, refundable, IST day key) ─
/** IST calendar day — the quota resets at midnight India time, not 05:30. */
function istDayKey(d: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(d);
}

/**
 * Consume ONE unit of the daily quota atomically (consume_chat_quota RPC,
 * migration 008): the increment is a single conditional SQL statement, so
 * parallel requests cannot exceed the limit.
 * Fail CLOSED on infrastructure errors — unbounded spend is worse than a
 * short outage. Call refundChatQuota() if the upstream call then fails.
 */
async function consumeChatQuota(
  userId: string,
  tier: string,
): Promise<{ allowed: boolean; dayKey: string }> {
  const dayKey = istDayKey();
  try {
    const { getAdminSupabase } = await import('@/lib/services/supabaseAdmin');
    const admin = getAdminSupabase();
    const { data, error } = await admin.rpc('consume_chat_quota', {
      p_user_id: userId,
      p_day: dayKey,
      p_limit: DAILY_QUOTA[tier] ?? DAILY_QUOTA.seeker,
    });
    if (error) throw new Error(error.message);
    const result = (typeof data === 'string' ? JSON.parse(data) : data) as {
      allowed?: boolean | null;
    };
    return { allowed: result.allowed === true, dayKey };
  } catch (e) {
    console.error('[chat] quota consume failed (fail-closed):', e instanceof Error ? e.message : e);
    return { allowed: false, dayKey };
  }
}

/** Refund one unit after an upstream failure (never burns the allowance). */
async function refundChatQuota(userId: string, dayKey: string): Promise<void> {
  try {
    const { getAdminSupabase } = await import('@/lib/services/supabaseAdmin');
    const admin = getAdminSupabase();
    await admin.rpc('refund_chat_quota', { p_user_id: userId, p_day: dayKey });
  } catch (e) {
    console.error('[chat] quota refund failed:', e instanceof Error ? e.message : e);
  }
}

// ── stock context, built server-side from the seed registry ────
function stockContext(symbol: string): string | null {
  const s = STOCKS[symbol.toUpperCase()];
  if (!s) return null;
  const pe = typeof s.pe === 'number' && s.pe > 0 ? s.pe : null;
  const roe = typeof s.roe === 'number' ? s.roe : null;
  return [
    `You are analyzing ${s.symbol} (${s.name}), sector: ${s.sector}.`,
    pe !== null ? `P/E ratio (seed data): ${pe}.` : '',
    roe !== null ? `ROE (seed data): ${roe}%.` : '',
    'Seed fundamentals may be stale — qualify any data you cite as indicative.',
  ].filter(Boolean).join(' ');
}

interface HistoryTurn {
  role: 'user' | 'assistant';
  content: string;
}

export async function POST(req: NextRequest) {
  // 1. Auth (T5 sessions). Anonymous callers get 401 — the UI falls back to
  //    canned responses from lib/chat/fallbackResponses*.ts.
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(
      { error: 'Authentication required', fallback: true },
      { status: 401 },
    );
  }

  // 2. Burst limit per IP — persistent counter (R6).
  const ip = clientIpFromHeaders(req.headers);
  if (!(await consumeIpBudget(ip, 'chat-burst', 12)).allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  // 3. Validate the contract FIRST — 400s must not burn quota. The daily
  //    quota is consumed atomically right before the upstream call (step 5)
  //    and refunded if the provider fails.
  let body: {
    personaId?: unknown;
    symbol?: unknown;
    history?: unknown;
    message?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const personaId = resolvePersonaId(typeof body.personaId === 'string' ? body.personaId : null);
  if (!personaId) {
    return NextResponse.json({ error: 'Unknown persona' }, { status: 400 });
  }
  const systemPrompt = CHAT_PERSONAS[personaId];

  const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (!message) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 });
  }
  if (message.length > MAX_MESSAGE_CHARS) {
    return NextResponse.json({ error: 'Message too long' }, { status: 413 });
  }

  let symbol: string | null = null;
  if (body.symbol != null) {
    if (typeof body.symbol !== 'string') {
      return NextResponse.json({ error: 'Invalid symbol' }, { status: 400 });
    }
    const candidate = body.symbol.trim().toUpperCase();
    if (!/^[A-Z0-9&_-]{1,25}$/.test(candidate)) {
      return NextResponse.json({ error: 'Invalid symbol' }, { status: 400 });
    }
    if (!STOCKS[candidate]) {
      return NextResponse.json({ error: 'Unknown symbol' }, { status: 400 });
    }
    symbol = candidate;
  }

  const rawHistory = Array.isArray(body.history) ? body.history : [];
  if (rawHistory.length > MAX_HISTORY_TURNS) {
    return NextResponse.json({ error: 'History too long' }, { status: 413 });
  }
  const history: HistoryTurn[] = [];
  let historyChars = 0;
  for (const turn of rawHistory) {
    const t = turn as { role?: unknown; content?: unknown };
    if (t?.role !== 'user' && t?.role !== 'assistant') {
      return NextResponse.json({ error: 'Invalid history role' }, { status: 400 });
    }
    if (typeof t.content !== 'string') {
      return NextResponse.json({ error: 'Invalid history entry' }, { status: 400 });
    }
    historyChars += t.content.length;
    if (historyChars > MAX_HISTORY_CHARS) {
      return NextResponse.json({ error: 'History too long' }, { status: 413 });
    }
    history.push({ role: t.role, content: t.content });
  }

  // 5. Compose the request. System prompt is server-built; persona + symbol
  //    context only. User text appears only in `user` turns.
  const contextLine = symbol ? stockContext(symbol) : null;
  const fullSystemPrompt = contextLine
    ? `${systemPrompt}\n\n${contextLine}`
    : systemPrompt;

  // 5.5 Consume the daily quota atomically (after all validation, before
  //     any provider spend). Refunded below if the provider fails.
  const quota = await consumeChatQuota(user.id, user.tier);
  if (!quota.allowed) {
    return NextResponse.json(
      { error: 'Daily chat quota exhausted', fallback: true },
      { status: 429 },
    );
  }

  // 6. Call the configured upstream provider — key via auth header, hard
  //    20s timeout. Provider selection is fail-closed.
  const provider = resolveChatProvider();
  if (!provider) {
    console.error(
      '[chat] no chat provider configured: set CHAT_API_BASE_URL + CHAT_API_KEY (OpenAI-compatible) or GEMINI_API_KEY',
    );
    return NextResponse.json({ error: 'Chat unavailable' }, { status: 503 });
  }

  if (provider.kind === 'openai') {
    // 6a. OpenAI-compatible endpoint. Key via the Authorization header,
    //     never the URL; user text only ever enters `user`/`system` messages
    //     built server-side here.
    const messages = [
      { role: 'system' as const, content: fullSystemPrompt },
      ...history.map(h => ({ role: h.role, content: h.content })),
      { role: 'user' as const, content: message },
    ];

    let res: Response;
    try {
      res = await fetch(`${provider.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${provider.apiKey}`,
        },
        body: JSON.stringify({
          model: provider.model,
          messages,
          temperature: 0.9,
          top_p: 0.95,
          max_tokens: 2048,
        }),
        signal: AbortSignal.timeout(20_000),
      });
    } catch (e) {
      console.error('[chat] upstream request failed:', e instanceof Error ? e.message : e);
      await refundChatQuota(user.id, quota.dayKey); // R6: provider failure must not burn quota
      return NextResponse.json({ error: 'Chat service error' }, { status: 502 });
    }

    if (!res.ok) {
      // Log details server-side; return a generic message only.
      const errText = await res.text();
      console.error('[chat] upstream API error:', res.status, errText.slice(0, 500));
      await refundChatQuota(user.id, quota.dayKey); // R6: refund on provider error
      return NextResponse.json({ error: 'Chat service error' }, { status: 502 });
    }

    const data = parseUpstream(OpenAIChatResponseSchema, await res.json(), 'chat-provider');
    const raw = data?.choices?.[0]?.message?.content;
    const text = typeof raw === 'string' ? raw.trim() : '';
    if (!text) {
      console.error('[chat] empty completion:', JSON.stringify(data).slice(0, 500));
      await refundChatQuota(user.id, quota.dayKey); // R6: refund on empty completion
      return NextResponse.json({ error: 'Chat service error' }, { status: 502 });
    }

    return NextResponse.json({ text });
  }

  // 6b. Gemini fallback (legacy) — key via the x-goog-api-key header.
  const contents = [
    ...history.map(h => ({
      role: h.role === 'user' ? 'user' : 'model',
      parts: [{ text: h.content }],
    })),
    { role: 'user', parts: [{ text: message }] },
  ];

  const geminiBody = {
    system_instruction: { parts: [{ text: fullSystemPrompt }] },
    contents,
    generationConfig: {
      temperature: 0.9,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 2048,
    },
  };

  let res: Response;
  try {
    res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${GEMINI_MODEL}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': provider.apiKey,
        },
        body: JSON.stringify(geminiBody),
        signal: AbortSignal.timeout(20_000),
      },
    );
  } catch (e) {
    console.error('[chat] Gemini request failed:', e instanceof Error ? e.message : e);
    return NextResponse.json({ error: 'Chat service error' }, { status: 502 });
  }

  if (!res.ok) {
    // Log details server-side; return a generic message only.
    const errText = await res.text();
    console.error('[chat] Gemini API error:', res.status, errText.slice(0, 500));
    await refundChatQuota(user.id, quota.dayKey); // R6: refund on provider error
    return NextResponse.json({ error: 'Chat service error' }, { status: 502 });
  }

  const data = parseUpstream(GeminiResponseSchema, await res.json(), 'chat-gemini');
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text || typeof text !== 'string') {
    console.error('[chat] empty completion:', JSON.stringify(data).slice(0, 500));
    await refundChatQuota(user.id, quota.dayKey); // R6: refund on empty completion
    return NextResponse.json({ error: 'Chat service error' }, { status: 502 });
  }

  return NextResponse.json({ text });
}
