/**
 * X3-08 (founder Round-16 C7) — alerts v2 acceptance.
 *
 * Founder acceptance, verbatim: "tests — trigger fires once across two
 * evaluator runs; unsubscribe stops delivery; rate limit enforced
 * (Constitution art. 12: persistent counter)."
 *
 * The evaluator is dependency-injected, so these run without a database;
 * the database-level halves of the same guarantees (UNIQUE constraint,
 * atomic counter upsert, RLS scoping) are proven on the CI Postgres by
 * the X3-08 block in scripts/ci/rls_invariants.sql.
 *
 * Fail-first (rule 21): run against the v1-equivalent mutant (an
 * evaluator without the insertEventIfAbsent gate / without the
 * unsubscribe and rate-limit checks) every acceptance test below fails —
 * raw outputs in the PR's Proof section.
 */
import { describe, expect, it, vi } from "vitest";
import { evaluateAlerts, type AlertsStore, type AlertTriggerRow, type NewAlertEvent } from "../lib/alerts/evaluate";
import { alertEventKey, rateLimitBucket, istDate } from "../lib/alerts/eventKeys";
import { buildAlertEmailBody, buildUnsubscribeUrl } from "../lib/alerts/delivery";

const NOW = new Date("2026-10-05T04:30:00.000Z"); // 10:00 IST

function makeStore(opts: { optedOut?: boolean } = {}) {
  const events = new Map<string, NewAlertEvent & { status: string }>();
  const rateCounts = new Map<string, number>();
  const store: AlertsStore = {
    async listActiveTriggers() {
      return triggers;
    },
    async insertEventIfAbsent(event) {
      const key = `${event.trigger_id}|${event.event_key}`;
      if (events.has(key)) return false; // the UNIQUE (trigger_id, event_key)
      events.set(key, { ...event, status: "pending" });
      return true;
    },
    async markDeliveryStatus(event_key, trigger_id, status) {
      events.set(`${trigger_id}|${event_key}`, {
        ...(events.get(`${trigger_id}|${event_key}`) as NewAlertEvent),
        status,
      });
    },
    async isOptedOut() {
      return opts.optedOut === true;
    },
    async consumeRateLimit(user_id, bucket, cap) {
      const k = `${user_id}|${bucket}`;
      const next = (rateCounts.get(k) ?? 0) + 1;
      rateCounts.set(k, next);
      return next <= cap;
    },
    async getUserEmailAndToken() {
      return { email: "user@example.test", token: "unsub-token-123" };
    },
  };
  return { store, events };
}

let triggers: AlertTriggerRow[] = [];

function deps(overrides: Partial<Parameters<typeof evaluateAlerts>[0]> = {}) {
  return {
    now: NOW,
    rateCapPerHour: 10,
    appOrigin: "https://rishi-terminal.vercel.app",
    ...overrides,
  } as Parameters<typeof evaluateAlerts>[0];
}

function fakeProvider() {
  const sendAlertEmail = vi.fn(async () => ({ ok: true, providerEventId: "p-1" }));
  return { sendAlertEmail, name: "fake" };
}

describe("X3-08 — alerts v2 acceptance", () => {
  it("trigger fires ONCE across two evaluator runs (idempotent)", async () => {
    triggers = [
      { id: "t1", user_id: "u1", symbol: "RELIANCE", kind: "price_above", threshold: 2500 },
    ];
    const { store, events } = makeStore();
    const provider = fakeProvider();
    const price = async () => 2600 as number | null;

    const first = await evaluateAlerts(deps({ store, price, provider }));
    const second = await evaluateAlerts(deps({ store, price, provider }));

    expect(first.eventsCreated).toBe(1);
    expect(second.eventsCreated).toBe(0); // the database said no
    expect(provider.sendAlertEmail).toHaveBeenCalledTimes(1);
    expect([...events.values()]).toHaveLength(1);
  });

  it("unsubscribe stops delivery (event still recorded, provider never called)", async () => {
    triggers = [
      { id: "t1", user_id: "u1", symbol: "TCS", kind: "price_below", threshold: 4000 },
    ];
    const { store, events } = makeStore({ optedOut: true });
    const provider = fakeProvider();

    const res = await evaluateAlerts(deps({ store, price: async () => 3900, provider }));

    expect(res.eventsCreated).toBe(1);
    expect(res.skippedUnsubscribed).toBe(1);
    expect(res.delivered).toBe(0);
    expect(provider.sendAlertEmail).not.toHaveBeenCalled();
    expect([...events.values()][0].status).toBe("skipped_unsubscribed");
  });

  it("rate limit enforced with a persistent counter (cap 2 -> third is skipped)", async () => {
    triggers = [
      { id: "t1", user_id: "u1", symbol: "A", kind: "price_above", threshold: 10 },
      { id: "t2", user_id: "u1", symbol: "B", kind: "price_above", threshold: 10 },
      { id: "t3", user_id: "u1", symbol: "C", kind: "price_above", threshold: 10 },
    ];
    const { store, events } = makeStore();
    const provider = fakeProvider();

    const res = await evaluateAlerts(
      deps({ store, rateCapPerHour: 2, price: async () => 11, provider }),
    );

    expect(res.eventsCreated).toBe(3);
    expect(res.delivered).toBe(2);
    expect(res.skippedRateLimited).toBe(1);
    const statuses = [...events.values()].map((e) => e.status).sort();
    expect(statuses).toEqual(["delivered", "delivered", "skipped_rate_limited"]);
  });

  it("FD-5 undecided: no provider -> 'skipped_no_provider', never a fake send", async () => {
    triggers = [
      { id: "t1", user_id: "u1", symbol: "SBIN", kind: "score_above", threshold: 70 },
    ];
    const { store, events } = makeStore();

    const res = await evaluateAlerts(
      deps({ store, score: async () => 75, provider: null }),
    );

    expect(res.eventsCreated).toBe(1);
    expect(res.skippedNoProvider).toBe(1);
    expect(res.delivered).toBe(0);
    expect([...events.values()][0].status).toBe("skipped_no_provider");
  });

  it("every email body carries the unsubscribe link", () => {
    const url = buildUnsubscribeUrl("https://rishi-terminal.vercel.app/", "tok-42");
    const body = buildAlertEmailBody({
      symbol: "RELIANCE", kind: "price_above", observed: 2600, threshold: 2500,
      unsubscribeUrl: url,
    });
    expect(body).toContain(url);
    expect(body).toContain("RELIANCE");
    expect(body).toContain("2600");
  });

  it("missing observation is NOT zero (fail-closed: no event)", async () => {
    triggers = [
      { id: "t1", user_id: "u1", symbol: "NOSTOCK", kind: "price_above", threshold: 100 },
    ];
    const { store } = makeStore();
    const provider = fakeProvider();

    const res = await evaluateAlerts(deps({ store, price: async () => null, provider }));
    expect(res.eventsCreated).toBe(0);
    expect(res.delivered).toBe(0);
  });

  it("filing triggers wait for D1-04 honestly (no fabricated events)", async () => {
    triggers = [
      { id: "t1", user_id: "u1", symbol: "RELIANCE", kind: "filing_new", threshold: 0 },
    ];
    const { store } = makeStore();
    const provider = fakeProvider();

    const res = await evaluateAlerts(deps({ store, price: async () => 1, provider }));
    expect(res.eventsCreated).toBe(0);
  });

  it("event keys are deterministic per IST day and the rate bucket is the UTC hour", () => {
    const k = alertEventKey({ kind: "price_above", symbol: "reliance", threshold: 2500, now: NOW });
    expect(k).toBe("price_above:RELIANCE:2500:2026-10-05"); // 04:30 UTC = 10:00 IST
    expect(istDate(new Date("2026-10-05T18:30:00.000Z"))).toBe("2026-10-06"); // 00:00 IST rollover
    expect(rateLimitBucket(NOW)).toBe("2026-10-05T04");
  });
});
