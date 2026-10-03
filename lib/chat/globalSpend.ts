import 'server-only';

/**
 * W3 (founder round-10): global chat cost safety.
 *
 * The per-identity daily quota (150/day) bounds a single abuser but NOT
 * a distributed one — an attacker with many IPs gets 150 units each.
 * These global caps bound TOTAL daily spend regardless of identity
 * count, plus a kill switch:
 *
 *   - CHAT_DISABLED: any truthy value ("1"/"true") returns the honest
 *     "temporarily unavailable" canned fallback before ANY quota,
 *     evidence, or upstream work.
 *   - CHAT_GLOBAL_DAILY_REQUESTS (default 2000): atomic global daily
 *     request cap (bump_rate_limit +1 per admitted request).
 *   - CHAT_GLOBAL_DAILY_TOKENS (default 2,000,000): atomic global daily
 *     token cap over the provider-reported usage; requests are denied
 *     once the counter is over. Providers that do not report usage
 *     contribute no tokens (the request cap still bounds them).
 *
 * Failure semantics: FAIL CLOSED, matching consume_chat_quota — when the
 * counter infrastructure is unreachable the request is refused; spend is
 * never allowed to run unbounded (Constitution rule 12). Token
 * RECORDING after a successful response is best-effort (logged): the
 * response is already served and cannot be unserved; the next request's
 * cap check still sees the recorded total.
 *
 * The counter key embeds the IST date (the same calendar the quota RPCs
 * use) so each day starts a fresh counter; the 25h window guarantees a
 * day-key's window never expires inside its own day.
 */

export const CHAT_GLOBAL_DAILY_REQUESTS_DEFAULT = 2000;
export const CHAT_GLOBAL_DAILY_TOKENS_DEFAULT = 2_000_000;

/** 25h — see the module header. */
const WINDOW_SECONDS = 90_000;

/** The kill switch: truthy CHAT_DISABLED ("1"/"true", case-insensitive). */
export function chatDisabled(): boolean {
  const v = process.env.CHAT_DISABLED;
  return v === '1' || v === 'true' || v === 'TRUE' || v === 'True';
}

function istDayKey(): string {
  // en-CA yields YYYY-MM-DD; the timezone is the same Asia/Kolkata the
  // quota RPCs use. The millisecond boundary drift this could introduce
  // against the RPC-computed day only affects WHICH key a request at
  // exact midnight counts toward — never the cap itself.
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
}

function reqKey(): string {
  return `chat:global:req:${istDayKey()}`;
}
function tokKey(): string {
  return `chat:global:tok:${istDayKey()}`;
}

function envInt(name: string, fallback: number): number {
  const v = process.env[name];
  if (!v) return fallback;
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/**
 * bump_rate_limit RPC wrapper. Returns allowed=false on infrastructure
 * failure (fail closed — see the module header).
 */
async function bump(key: string, increment: number, limit: number): Promise<boolean> {
  try {
    const { getAdminSupabase } = await import('@/lib/services/supabaseAdmin');
    const { data, error } = await getAdminSupabase().rpc('bump_rate_limit', {
      p_key: key,
      p_increment: increment,
      p_limit: limit,
      p_window_seconds: WINDOW_SECONDS,
    });
    if (error) throw new Error(error.message);
    return (data as { allowed?: boolean } | null)?.allowed === true;
  } catch (e) {
    console.error('[chat] global spend counter failed (failing closed):', e instanceof Error ? e.message : e);
    return false;
  }
}

/** Admit one request against the global daily request cap. */
export async function globalRequestCapExceeded(): Promise<boolean> {
  return !(await bump(reqKey(), 1, envInt('CHAT_GLOBAL_DAILY_REQUESTS', CHAT_GLOBAL_DAILY_REQUESTS_DEFAULT)));
}

/** Check the global daily token cap WITHOUT consuming anything. */
export async function globalTokenCapExceeded(): Promise<boolean> {
  return !(await bump(tokKey(), 0, envInt('CHAT_GLOBAL_DAILY_TOKENS', CHAT_GLOBAL_DAILY_TOKENS_DEFAULT)));
}

/**
 * Record the provider-reported token usage of a served response.
 * Best-effort: logs (never throws) — the response is already served;
 * the next request's cap check sees the recorded total.
 */
export async function recordGlobalTokens(totalTokens: number | null | undefined): Promise<void> {
  if (typeof totalTokens !== 'number' || !Number.isFinite(totalTokens) || totalTokens <= 0) return;
  const limit = envInt('CHAT_GLOBAL_DAILY_TOKENS', CHAT_GLOBAL_DAILY_TOKENS_DEFAULT);
  const allowed = await bump(tokKey(), Math.round(totalTokens), limit);
  if (!allowed) {
    console.warn('[chat] global daily token cap reached — subsequent requests will be refused until the IST day rolls');
  }
}
