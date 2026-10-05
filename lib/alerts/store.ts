// lib/alerts/store.ts (X3-08) — the Supabase-backed AlertsStore.
//
// The evaluator's contract (lib/alerts/evaluate.ts) implemented against
// the migration 027 schema. The cron/evaluate route uses the
// service-role client (it acts for all users; CRON_SECRET-gated, never
// public); user routes use the request's user-scoped client so Postgres
// RLS decides every row (Constitution 7 + 13).
//
// Idempotency and the rate limit are DATABASE mechanics (UNIQUE +
// atomic upsert-increment), not caller-side bookkeeping — the same
// guarantees the CI Postgres proves in scripts/ci/rls_invariants.sql.

import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { AlertsStore, AlertTriggerRow, NewAlertEvent } from './evaluate';
import { buildUnsubscribeToken } from './unsubToken';

function serviceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('alerts store: Supabase service credentials are not configured');
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

/** The server-side store (cron context: acts for all users). */
export function alertsStore(): AlertsStore {
  const db = serviceClient();
  return {
    async listActiveTriggers(): Promise<AlertTriggerRow[]> {
      const { data, error } = await db
        .from('alerts_triggers')
        .select('id, user_id, symbol, kind, threshold')
        .eq('active', true);
      if (error) throw new Error(`alerts store: ${error.message}`);
      return (data ?? []) as AlertTriggerRow[];
    },

    async insertEventIfAbsent(event: NewAlertEvent): Promise<boolean> {
      // ON CONFLICT DO NOTHING + a returned row = the row was created;
      // a conflict returns null and nothing is delivered again.
      const { data, error } = await db
        .from('alerts_events')
        .insert({ ...event, delivery_status: 'pending' })
        .select('id')
        .maybeSingle();
      if (error) throw new Error(`alerts store: ${error.message}`);
      return data !== null;
    },

    async markDeliveryStatus(event_key: string, trigger_id: string, status: string): Promise<void> {
      const { error } = await db
        .from('alerts_events')
        .update({ delivery_status: status, delivered_at: status === 'delivered' ? new Date().toISOString() : null })
        .eq('trigger_id', trigger_id)
        .eq('event_key', event_key);
      if (error) throw new Error(`alerts store: ${error.message}`);
    },

    async isOptedOut(user_id: string): Promise<boolean> {
      const { data } = await db
        .from('alerts_preferences')
        .select('opted_out')
        .eq('user_id', user_id)
        .maybeSingle();
      return data?.opted_out === true;
    },

    async consumeRateLimit(user_id: string, bucket: string, cap: number): Promise<boolean> {
      // Atomic upsert-increment: one statement, one winner (Constitution 12).
      const { data, error } = await db.rpc('alerts_consume_rate_limit', {
        p_user: user_id,
        p_bucket: bucket,
        p_cap: cap,
      });
      if (error) throw new Error(`alerts store: ${error.message}`);
      return data === true;
    },

    async getUserEmailAndToken(user_id: string): Promise<{ email: string; token: string } | null> {
      const { data: authUser, error } = await db.auth.admin.getUserById(user_id);
      if (error || !authUser.user?.email) return null;
      return { email: authUser.user.email, token: buildUnsubscribeToken(user_id) };
    },
  };
}

/** Opt a user out (the unsubscribe endpoint; token already verified). */
export async function setOptedOut(user_id: string): Promise<void> {
  const db = serviceClient();
  const { error } = await db
    .from('alerts_preferences')
    .upsert(
      { user_id, opted_out: true, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' },
    );
  if (error) throw new Error(`alerts store: ${error.message}`);
}
