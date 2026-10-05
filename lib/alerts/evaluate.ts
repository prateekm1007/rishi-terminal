// lib/alerts/evaluate.ts (X3-08) — the server-side alert evaluator.
//
// Founder Round-16 C7 acceptance (tests, not vibes):
//   - "trigger fires once across two evaluator runs" — the store's
//     insertEventIfAbsent (UNIQUE (trigger_id, event_key) + ON CONFLICT
//     DO NOTHING at the database) returns true only for the FIRST run;
//     the second run's insert is a no-op and no delivery happens.
//   - "unsubscribe stops delivery" — opted-out users still get the EVENT
//     recorded (their in-app history stays honest) but delivery_status
//     is 'skipped_unsubscribed' and the provider is never called.
//   - "rate limit enforced (Constitution art. 12: persistent counter)" —
//     consumeRateLimit is the store's atomic upsert-increment; over-cap
//     events are recorded 'skipped_rate_limited'.
//
// The evaluator is dependency-injected (store, prices, scores, clock) so
// the acceptance tests run without a database; the Supabase-backed store
// (lib/alerts/store.ts) carries the same contract against Postgres, and
// scripts/ci/rls_invariants.sql proves the DB-level halves (unique
// constraint, counter, RLS) on the CI Postgres.

import { alertEventKey, rateLimitBucket } from './eventKeys';
import { getAlertProvider, buildAlertEmailBody, buildUnsubscribeUrl } from './delivery';

export type TriggerKind = 'price_above' | 'price_below' | 'score_above' | 'score_below' | 'filing_new';

export interface AlertTriggerRow {
  id: string;
  user_id: string;
  symbol: string;
  kind: TriggerKind;
  threshold: number;
}

export interface NewAlertEvent {
  trigger_id: string;
  user_id: string;
  event_key: string;
  observed_value: number;
}

/** The storage contract the evaluator depends on. */
export interface AlertsStore {
  listActiveTriggers(): Promise<AlertTriggerRow[]>;
  /** true = this call created the row (first evaluator run); false = the
   *  event already existed (idempotent replay). */
  insertEventIfAbsent(event: NewAlertEvent): Promise<boolean>;
  /** Record the terminal delivery state for the event just inserted. */
  markDeliveryStatus(event_key: string, trigger_id: string, status: string): Promise<void>;
  isOptedOut(user_id: string): Promise<boolean>;
  /** Atomic persistent counter: increments and returns whether the call
   *  was inside the cap (Constitution 12 — the DB upsert is the counter). */
  consumeRateLimit(user_id: string, bucket: string, cap: number): Promise<boolean>;
  /** The user's email + their unsubscribe token (created on first use). */
  getUserEmailAndToken(user_id: string): Promise<{ email: string; token: string } | null>;
}

export interface EvaluatorDeps {
  store: AlertsStore;
  /** Price observations (INR) per symbol; null = no observation. */
  price(symbol: string): Promise<number | null>;
  /** Rishi consensus score per symbol; null = not scored. */
  score(symbol: string): Promise<number | null>;
  now: Date;
  /** Deliveries per user per hour (the persistent counter's cap). */
  rateCapPerHour: number;
  /** The public origin for unsubscribe links. */
  appOrigin: string;
  /** Injectable for tests; defaults to the env-driven selection. */
  provider?: ReturnType<typeof getAlertProvider>;
  log?: (line: string) => void;
}

export interface EvaluationSummary {
  triggersConsidered: number;
  eventsCreated: number;
  deliveriesAttempted: number;
  delivered: number;
  skippedUnsubscribed: number;
  skippedRateLimited: number;
  skippedNoProvider: number;
  failed: number;
}

export async function evaluateAlerts(deps: EvaluatorDeps): Promise<EvaluationSummary> {
  const { store } = deps;
  const provider = deps.provider !== undefined ? deps.provider : getAlertProvider();
  const log = deps.log ?? (() => {});
  const summary: EvaluationSummary = {
    triggersConsidered: 0,
    eventsCreated: 0,
    deliveriesAttempted: 0,
    delivered: 0,
    skippedUnsubscribed: 0,
    skippedRateLimited: 0,
    skippedNoProvider: 0,
    failed: 0,
  };

  const triggers = await store.listActiveTriggers();
  summary.triggersConsidered = triggers.length;

  for (const trigger of triggers) {
    // Observe the trigger's series (fail-closed on missing data: no
    // observation -> no event; a missing price is never 0).
    let observed: number | null = null;
    if (trigger.kind === 'price_above' || trigger.kind === 'price_below') {
      observed = await deps.price(trigger.symbol);
    } else if (trigger.kind === 'score_above' || trigger.kind === 'score_below') {
      observed = await deps.score(trigger.symbol);
    } else {
      // filing_new: no filing source exists until D1-04 (FD-1). Honest
      // skip — never a fabricated event.
      log(`[alerts] trigger ${trigger.id}: filing source not configured (D1-04 pending) — skipped`);
      continue;
    }
    if (observed === null || !Number.isFinite(observed)) continue;

    const fires =
      trigger.kind === 'price_above' || trigger.kind === 'score_above'
        ? observed >= trigger.threshold
        : observed <= trigger.threshold;
    if (!fires) continue;

    const event_key = alertEventKey({
      kind: trigger.kind,
      symbol: trigger.symbol,
      threshold: trigger.threshold,
      now: deps.now,
    });

    const created = await store.insertEventIfAbsent({
      trigger_id: trigger.id,
      user_id: trigger.user_id,
      event_key,
      observed_value: observed,
    });
    if (!created) continue; // second evaluator run: the database says no.
    summary.eventsCreated++;

    // Delivery pipeline (unsubscribe -> rate limit -> provider).
    if (await store.isOptedOut(trigger.user_id)) {
      await store.markDeliveryStatus(event_key, trigger.id, 'skipped_unsubscribed');
      summary.skippedUnsubscribed++;
      continue;
    }
    const allowed = await store.consumeRateLimit(
      trigger.user_id,
      rateLimitBucket(deps.now),
      deps.rateCapPerHour,
    );
    if (!allowed) {
      await store.markDeliveryStatus(event_key, trigger.id, 'skipped_rate_limited');
      summary.skippedRateLimited++;
      continue;
    }
    summary.deliveriesAttempted++;

    if (provider === null) {
      // FD-5 undecided: record honestly, never fake a send.
      await store.markDeliveryStatus(event_key, trigger.id, 'skipped_no_provider');
      summary.skippedNoProvider++;
      continue;
    }

    const user = await store.getUserEmailAndToken(trigger.user_id);
    if (!user) {
      await store.markDeliveryStatus(event_key, trigger.id, 'failed');
      summary.failed++;
      continue;
    }
    const unsubscribeUrl = buildUnsubscribeUrl(deps.appOrigin, user.token);
    try {
      const res = await provider.sendAlertEmail({
        to: user.email,
        subject: `Rishi Terminal: ${trigger.symbol} alert`,
        body: buildAlertEmailBody({
          symbol: trigger.symbol,
          kind: trigger.kind,
          observed,
          threshold: trigger.threshold,
          unsubscribeUrl,
        }),
        unsubscribeUrl,
      });
      if (res.ok) {
        await store.markDeliveryStatus(event_key, trigger.id, 'delivered');
        summary.delivered++;
      } else {
        await store.markDeliveryStatus(event_key, trigger.id, 'failed');
        summary.failed++;
        log(`[alerts] delivery failed for ${event_key}: ${res.error ?? 'unknown'}`);
      }
    } catch (err) {
      await store.markDeliveryStatus(event_key, trigger.id, 'failed');
      summary.failed++;
      log(`[alerts] delivery threw for ${event_key}: ${String(err)}`);
    }
  }

  return summary;
}
