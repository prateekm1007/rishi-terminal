import 'server-only';

import { getAdminSupabase } from '@/lib/services/supabaseAdmin';
import { MAX_COMPLETION_TOKENS } from '@/lib/ai/providers/openaiCompatible';
import { MAX_COMPLETIONS_PER_REQUEST } from '@/lib/ai/router';

/**
 * W3 (founder round-10) global chat cost safety — CLOSED under the
 * founder round-11 review (defects A/B/C):
 *
 *   - HARD token cap via reservation + settlement (defect A). The
 *     merged W3 read the counter with increment 0, called the provider,
 *     and recorded usage afterward: concurrent requests all passed the
 *     read, and usage-less vendors spent uncounted tokens. Now ONE
 *     atomic admission step (reserve_chat_global_spend, migration 020)
 *     adds the request slot AND this request's worst-case completion
 *     budget behind a GUARDED UPDATE — the daily counter can never
 *     exceed either cap at admission. Every exit path then settles the
 *     reservation to the ACTUAL provider-reported usage (0 when the
 *     provider was never reached: a failed request must not leak its
 *     reservation).
 *
 *       RESERVATION_TOKENS = MAX_COMPLETION_TOKENS
 *                            x MAX_COMPLETIONS_PER_REQUEST
 *
 *     Both factors are the mechanical constants the provider request
 *     bodies and the tool loop actually use (single source: imported,
 *     not restated). The reservation bounds the OUTPUT budget
 *     mechanically; usage is total (input + output), so settlement can
 *     push the counter above the cap by at most one request's
 *     input-token excess — disclosed here, not hidden.
 *
 *   - SINGULAR CHAT_DISABLED contract (defect B). Unset/empty ->
 *     enabled. "0"/"false"/"off"/"no" (case-insensitive) -> enabled
 *     (explicit operator intent). ANY other non-empty value ->
 *     DISABLED: the failure mode of an ambiguous operator value is the
 *     protective state, matching the RANKINGS_ENABLED fail-closed
 *     rationale. Code, .env.example, docs and the tests say exactly
 *     this.
 *
 *   - ONE day boundary (defect C). The counters live in
 *     chat_global_spend keyed by the IST date computed in SQL — no
 *     date is derived in JavaScript, and none crosses the RPC boundary.
 *
 * The global REQUEST cap counts admitted requests (+1 at the same
 * atomic reservation; no settlement — a request that reached admission
 * consumed platform work even if it failed afterward).
 *
 * Failure semantics (the merged W3 contract, kept): FAIL CLOSED — when
 * the counter infrastructure is unreachable the request is refused;
 * spend is never allowed to run unbounded (rule 12). Settlement is
 * best-effort (logged, never thrown): a lost settlement leaks at most
 * one reservation until the IST day rolls; the deployment that serves
 * this code must apply migration 020 FIRST (W2 sequencing discipline).
 */

export const CHAT_GLOBAL_DAILY_REQUESTS_DEFAULT = 2000;
export const CHAT_GLOBAL_DAILY_TOKENS_DEFAULT = 2_000_000;

/** This request's worst-case completion budget, reserved atomically at
 *  admission and settled to actual usage afterward (defect A). */
export const RESERVATION_TOKENS = MAX_COMPLETION_TOKENS * MAX_COMPLETIONS_PER_REQUEST;

/** The kill switch — the SINGULAR contract (defect B):
 *  unset/empty/whitespace -> enabled; "0"/"false"/"off"/"no"
 *  (case-insensitive) -> enabled; ANY other non-empty value -> DISABLED
 *  (ambiguous values fail closed, Rule 6). */
export function chatDisabled(): boolean {
  const raw = process.env.CHAT_DISABLED;
  if (raw === undefined) return false;
  const v = raw.trim().toLowerCase();
  if (v === '') return false;
  return !(v === '0' || v === 'false' || v === 'off' || v === 'no');
}

function envInt(name: string, fallback: number): number {
  const v = process.env[name];
  if (!v) return fallback;
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export interface GlobalSpendReservation {
  ok: boolean;
  /** The reserved token budget — carried to settlement so the RPC can
   *  subtract exactly what was reserved (no double counting). */
  reservedTokens: number;
}

/**
 * ONE atomic admission step: +1 request and +RESERVATION_TOKENS behind
 * the guarded chat_global_spend UPDATE (migration 020). Returns ok=false
 * when either cap would be exceeded OR the counter infrastructure is
 * unreachable (fail closed).
 */
export async function reserveChatGlobalSpend(): Promise<GlobalSpendReservation> {
  try {
    const { data, error } = await getAdminSupabase().rpc('reserve_chat_global_spend', {
      p_request_increment: 1,
      p_request_cap: envInt('CHAT_GLOBAL_DAILY_REQUESTS', CHAT_GLOBAL_DAILY_REQUESTS_DEFAULT),
      p_token_increment: RESERVATION_TOKENS,
      p_token_cap: envInt('CHAT_GLOBAL_DAILY_TOKENS', CHAT_GLOBAL_DAILY_TOKENS_DEFAULT),
    });
    if (error) throw new Error(error.message);
    const ok = (data as { ok?: boolean } | null)?.ok === true;
    return { ok, reservedTokens: ok ? RESERVATION_TOKENS : 0 };
  } catch (e) {
    console.error('[chat] global spend reservation failed (failing closed):',
      e instanceof Error ? e.message : e);
    return { ok: false, reservedTokens: 0 };
  }
}

/**
 * Settle a reservation to the ACTUAL provider-reported usage. Never
 * throws: a settlement failure leaks at most one reservation until the
 * IST day rolls, and must never fail a response that already succeeded
 * (or an error path that is already being served).
 */
export async function settleChatGlobalTokens(reservedTokens: number, actualTokens: number | null): Promise<void> {
  try {
    const actual = typeof actualTokens === 'number' && Number.isFinite(actualTokens) && actualTokens > 0
      ? Math.round(actualTokens)
      : 0;
    const { error } = await getAdminSupabase().rpc('settle_chat_global_tokens', {
      p_reserved: reservedTokens,
      p_actual: actual,
    });
    if (error) throw new Error(error.message);
  } catch (e) {
    console.error('[chat] global spend settlement failed (bounded by one reservation):',
      e instanceof Error ? e.message : e);
  }
}
