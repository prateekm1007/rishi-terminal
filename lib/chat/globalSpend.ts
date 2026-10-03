import 'server-only';

/**
 * W3 (founder round-10) + W3 closure (founder round-10 review, 2026-10-03):
 * global chat cost safety.
 *
 * The per-identity daily quota (150/day) bounds a single abuser but NOT
 * a distributed one — an attacker with many IPs gets 150 units each.
 * These global caps bound TOTAL daily spend regardless of identity
 * count, plus a kill switch:
 *
 *   - CHAT_DISABLED: the kill switch (ONE contract, identical in code,
 *     .env.example, docs/ACCESS_MODEL.md and tests): unset or "" or one
 *     of the explicit false-y spellings 0/false/no/off (case-insensitive,
 *     after trim) leaves chat ENABLED; EVERY other non-empty value
 *     DISABLES it. A typo'd "ture" must fail toward OFF — this is a cost
 *     kill switch, and the failure it exists to prevent is spend, not
 *     availability. Disabled answers with the honest "temporarily
 *     unavailable" canned fallback before ANY quota, evidence, or
 *     upstream work.
 *   - CHAT_GLOBAL_DAILY_REQUESTS (default 2000): atomic global daily
 *     request admission (reserve_rate_limit +1 per admitted request).
 *   - CHAT_GLOBAL_DAILY_TOKENS (default 2,000,000): a HARD spend bound.
 *     Before the provider call the request RESERVES the single-request
 *     ceiling below (refused when it does not fit under the cap); after
 *     the response the reservation is SETTLED to the provider-reported
 *     usage. Concurrency can therefore never push the counter past the
 *     cap at admission time, and requests whose usage goes unreported
 *     still pay their full reservation (defect A of the W3 review: the
 *     old check-then-record scheme admitted concurrent requests past the
 *     nominal ceiling and counted nothing for unreported usage).
 *
 * Failure semantics: FAIL CLOSED, matching consume_chat_quota — when the
 * counter infrastructure is unreachable the request is refused; spend is
 * never allowed to run unbounded (Constitution rule 12). SETTLEMENT and
 * RELEASE after the fact are best-effort (logged, never thrown): the
 * response is already served or the request already failed; a leaked
 * reservation is bounded (at most one ceiling per affected request) and
 * expires with its IST day key.
 *
 * The IST day is computed ONLY inside the RPCs (migration 020) — the
 * same SQL expression consume_chat_quota has used since 008. There is
 * no JavaScript day-key anywhere (W3 review defect C: one source of
 * truth per concept). The 25h window guarantees a day-key's window
 * never expires inside its own day.
 */

export const CHAT_GLOBAL_DAILY_REQUESTS_DEFAULT = 2000;
export const CHAT_GLOBAL_DAILY_TOKENS_DEFAULT = 2_000_000;

/** 25h — see the module header. */
const WINDOW_SECONDS = 90_000;

/** Stable key prefixes; the IST day suffix is appended INSIDE the RPCs. */
const REQ_KEY_PREFIX = 'chat:global:req';
const TOK_KEY_PREFIX = 'chat:global:tok';

/**
 * W3-A: the single-request token reservation ceiling. Mechanical
 * derivation (every factor is a bound of the production loop, pinned by
 * test/globalSpendReservation.test.ts):
 *
 *   completions <= 1 (initial) + MAX_TOOL_ITERATIONS (4, post-tool)
 *                  + 1 (MAX_FINAL_REPAIRS)
 *   attempts    <= MAX_PROVIDER_CANDIDATES (2: OpenAI-compatible primary
 *                  + Gemini fallback) per completion — a failed attempt
 *                  can still have spent provider-side tokens, so the
 *                  failover pair is fully covered
 *   output      <= 2,048 tokens per attempt (the providers' max_tokens /
 *                  maxOutputTokens request caps)
 *   input       <= 22,000 tokens per attempt: 64,000 chars at the
 *                  conservative 3 chars/token, composed of the measured
 *                  worst cases — server-built system context ~4,000
 *                  (persona prompt max 1,524 across the canonical
 *                  registry + UNTRUSTED_HISTORY_BLOCK 1,283 + tool
 *                  protocol 767) + evidence block 16,000 (16-item live
 *                  package measured 4,731 chars; merged tool evidence
 *                  carries the same item shapes) + history 8,000 (route
 *                  contract) + message 2,000 (route contract) + loop
 *                  turns 25,000 (5 tool request/result pairs) + repair
 *                  turns 9,000 (discarded candidate + validator
 *                  feedback)
 *
 * R = (1 + 4 + 1) x 2 x (22,000 + 2,048) = 288,576.
 *
 * Consequence (documented, accepted): a request is admitted only while
 * counter + R <= cap, so the last R of a day's budget is reserved for
 * in-flight requests and at most floor(cap / R) requests can be
 * concurrently in flight. CHAT_GLOBAL_DAILY_TOKENS smaller than R
 * admits nothing — an operator setting a cap below one request's worst
 * case gets fail-closed refusal, by design.
 */
export const GLOBAL_TOKEN_RESERVATION_CEILING = 6 * 2 * (22_000 + 2_048); // 288,576

/** The exact false-y spellings (case-insensitive, trimmed) that leave
 *  chat ENABLED. Every other non-empty CHAT_DISABLED value disables. */
const CHAT_DISABLED_FALSEY = new Set(['0', 'false', 'no', 'off']);

/** The kill switch — see the module header for the ONE contract. */
export function chatDisabled(): boolean {
  const v = process.env.CHAT_DISABLED?.trim();
  if (!v) return false;
  return !CHAT_DISABLED_FALSEY.has(v.toLowerCase());
}

function envInt(name: string, fallback: number): number {
  const v = process.env[name];
  if (!v) return fallback;
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/**
 * reserve_rate_limit RPC wrapper (migration 020): the guarded atomic
 * increment — the counter moves ONLY when count + amount fits under the
 * limit, so concurrent admissions can never exceed it. Returns
 * allowed=false on infrastructure failure (fail closed).
 */
async function reserve(keyPrefix: string, amount: number, limit: number): Promise<boolean> {
  try {
    const { getAdminSupabase } = await import('@/lib/services/supabaseAdmin');
    const { data, error } = await getAdminSupabase().rpc('reserve_rate_limit', {
      p_key_prefix: keyPrefix,
      p_amount: amount,
      p_limit: limit,
      p_window_seconds: WINDOW_SECONDS,
    });
    if (error) throw new Error(error.message);
    return (data as { allowed?: boolean } | null)?.allowed === true;
  } catch (e) {
    console.error('[chat] global spend reservation failed (failing closed):', e instanceof Error ? e.message : e);
    return false;
  }
}

/**
 * settle_rate_limit RPC wrapper (migration 020): the settlement
 * adjustment. p_delta may be negative (releasing the over-reservation)
 * or positive (a provider reporting MORE than the ceiling — recorded
 * honestly, never refused: settlement is a ledger, not an admission).
 * Best-effort and logged; never throws into the response path.
 */
async function settle(keyPrefix: string, delta: number): Promise<void> {
  try {
    const { getAdminSupabase } = await import('@/lib/services/supabaseAdmin');
    const { error } = await getAdminSupabase().rpc('settle_rate_limit', {
      p_key_prefix: keyPrefix,
      p_delta: Math.round(delta),
    });
    if (error) throw new Error(error.message);
  } catch (e) {
    console.error('[chat] global spend settlement failed (logged, not thrown):', e instanceof Error ? e.message : e);
  }
}

/** Admit one request against the global daily request cap (atomic +1). */
export async function globalRequestCapExceeded(): Promise<boolean> {
  return !(await reserve(REQ_KEY_PREFIX, 1, envInt('CHAT_GLOBAL_DAILY_REQUESTS', CHAT_GLOBAL_DAILY_REQUESTS_DEFAULT)));
}

/**
 * Reserve the single-request token ceiling against the global daily
 * token cap. True when the reservation was granted — the caller may
 * reach the provider. False (denied or infrastructure failure) — fail
 * closed.
 */
export async function reserveGlobalTokens(): Promise<boolean> {
  return reserve(TOK_KEY_PREFIX, GLOBAL_TOKEN_RESERVATION_CEILING, envInt('CHAT_GLOBAL_DAILY_TOKENS', CHAT_GLOBAL_DAILY_TOKENS_DEFAULT));
}

/**
 * Settle a served response to its provider-reported usage: the counter
 * moves by (actual - reserved). Usage that is missing, non-finite, or
 * non-positive is treated as UNAVAILABLE and keeps the full reservation
 * (unknown spend is charged at the ceiling). Multi-completion requests
 * settle once with the accumulated total — reserve + settle nets to the
 * actual usage with no double counting.
 */
export async function settleGlobalTokens(totalTokens: number | null | undefined): Promise<void> {
  const usable = typeof totalTokens === 'number' && Number.isFinite(totalTokens) && totalTokens > 0;
  const delta = usable ? (totalTokens as number) - GLOBAL_TOKEN_RESERVATION_CEILING : 0;
  await settle(TOK_KEY_PREFIX, delta);
}

/**
 * Release the reservation on a path that never delivered an answer
 * (upstream failure, unconfigured provider, evidence-assembly failure,
 * per-identity quota denial). Mirrors refund_chat_quota: a failed
 * request must not burn the caller's unit NOR the global budget. A
 * request that crossed the IST midnight between reserve and release
 * settles against the new day's key (no row) — the old day's key keeps
 * the reservation: over-counted by at most one ceiling per crossing
 * request, conservative direction, expires with the day.
 */
export async function releaseGlobalTokens(): Promise<void> {
  await settle(TOK_KEY_PREFIX, -GLOBAL_TOKEN_RESERVATION_CEILING);
}
