import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { resolvePersonaId, CHAT_PERSONAS } from '@/lib/chat/personas';
import { STOCKS } from '@/data/stocks';

/**
 * POST /api/chat — hardened Gemini proxy (remediation T7).
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
 * - The Gemini key is sent via the x-goog-api-key header, never the URL.
 * - Upstream error details are logged server-side; clients get generic
 *   messages (no `details`, no `raw`).
 * - Prompt-injection hygiene: user text only ever enters `user` turns.
 */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = 'models/gemini-2.5-flash';

const MAX_MESSAGE_CHARS = 2000;
const MAX_HISTORY_TURNS = 20;
const MAX_HISTORY_CHARS = 8000;

// Daily chat quota by tier (documented choice; seeker free tier is modest).
const DAILY_QUOTA: Record<string, number> = {
  seeker: 15,
  student: 150,
  disciple: 500,
};

// ── per-IP burst limiter (in-memory, per server instance) ──────
const BURST_WINDOW_MS = 60_000;
const BURST_MAX_REQUESTS = 12;
const ipHits = new Map<string, number[]>();

function ipBurstExceeded(ip: string): boolean {
  const now = Date.now();
  const hits = (ipHits.get(ip) ?? []).filter(t => now - t < BURST_WINDOW_MS);
  hits.push(now);
  ipHits.set(ip, hits);
  // Keep the map bounded.
  if (ipHits.size > 10_000) {
    for (const [k, v] of ipHits) {
      if (v.every(t => now - t >= BURST_WINDOW_MS)) ipHits.delete(k);
    }
  }
  return hits.length > BURST_MAX_REQUESTS;
}

function clientIp(req: NextRequest): string {
  return (
    req.headers.get('x-real-ip') ??
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown'
  );
}

// ── per-user daily quota (Supabase-backed) ─────────────────────
async function quotaExceeded(userId: string, tier: string): Promise<boolean> {
  try {
    const { getAdminSupabase } = await import('@/lib/services/supabaseAdmin');
    const admin = getAdminSupabase();
    const day = new Date().toISOString().slice(0, 10);

    const { data } = await admin
      .from('chat_usage')
      .select('count')
      .eq('user_id', userId)
      .eq('day', day)
      .maybeSingle();

    const used = (data as { count: number } | null)?.count ?? 0;
    if (used >= (DAILY_QUOTA[tier] ?? DAILY_QUOTA.seeker)) {
      return true;
    }

    await admin
      .from('chat_usage')
      .upsert(
        { user_id: userId, day, count: used + 1 },
        { onConflict: 'user_id,day' },
      );
    return false;
  } catch (e) {
    // Fail closed on quota infrastructure errors: do not allow unbounded
    // spend when the counter is unavailable.
    console.error('[chat] quota check failed:', e instanceof Error ? e.message : e);
    return true;
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

  // 2. Burst limit per IP.
  if (ipBurstExceeded(clientIp(req))) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  // 3. Daily quota per user by tier (server-resolved tier, never client).
  if (await quotaExceeded(user.id, user.tier)) {
    return NextResponse.json(
      { error: 'Daily chat quota exhausted', fallback: true },
      { status: 429 },
    );
  }

  // 4. Validate the contract.
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

  // 6. Call Gemini — key via header, hard 20s timeout.
  if (!GEMINI_API_KEY) {
    console.error('[chat] GEMINI_API_KEY is not configured');
    return NextResponse.json({ error: 'Chat unavailable' }, { status: 503 });
  }

  let res: Response;
  try {
    res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${GEMINI_MODEL}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': GEMINI_API_KEY,
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
    return NextResponse.json({ error: 'Chat service error' }, { status: 502 });
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text || typeof text !== 'string') {
    console.error('[chat] empty completion:', JSON.stringify(data).slice(0, 500));
    return NextResponse.json({ error: 'Chat service error' }, { status: 502 });
  }

  return NextResponse.json({ text });
}
