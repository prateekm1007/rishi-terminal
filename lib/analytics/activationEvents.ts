"use client";

/**
 * lib/analytics/activationEvents — the closed activation-event vocabulary
 * and the PII-refusing property validator (G7-01 + DEMO-5, founder order
 * 2026-10-12).
 *
 * Fail-closed (rule 6): the validator REFUSES unknown event names and any
 * property that carries PII (email / user id / token / password / free
 * text). The consent gate lives in hooks/useActivationEvents.ts; this
 * module is the pure boundary both the tests and the hook share (rule 14).
 *
 * No vendor: records go to the structured console sink (ENG-5 — structured
 * logs without PII until a monitoring vendor is chosen). Nothing here
 * sends anything over the network.
 *
 * E6-02 (bundle budget, 2026-10-12): this module is deliberately ZOD-FREE.
 * Importing zod here pulled it into the /stock/[symbol] client bundle
 * (StockPageClient + RishiGrid import the consent hook) and regressed the
 * route's first load 171.2 → 260.3 kB — the CI budget gate caught it. Rule
 * 9's zod mandate governs UPSTREAM payloads crossing trust boundaries; an
 * activation record is constructed INTERNALLY in the browser, never
 * received from a wire, and the closed vocabulary below + the schema tests
 * (test/analytics.consent.test.ts) keep the same refusal contract without
 * the dependency. Same inputs refuse, same inputs pass — pinned by tests.
 */

/** The five activation events (docs/analytics.md — the closed union). */
export const ACTIVATION_EVENTS = [
  "search_performed",
  "stock_viewed",
  "dissent_expanded",
  "flip_expanded",
  "watchlist_added",
] as const;

export type ActivationEvent = (typeof ACTIVATION_EVENTS)[number];

const ACTIVATION_EVENT_SET: ReadonlySet<string> = new Set(ACTIVATION_EVENTS);

/** PII key rejection: any property key containing these tokens refuses
 * (case-insensitive) — G7-01: "schema test rejects events containing
 * email or user id in properties". */
const PII_KEY_TOKENS = ["email", "user_id", "userid", "token", "password", "phone"] as const;

function keyCarriesPii(key: string): boolean {
  const k = key.toLowerCase();
  return k === "name" || k === "ip" || PII_KEY_TOKENS.some((t) => k.includes(t));
}

/** Property values: short strings or integers — no objects, arrays, or
 * long free text (docs/analytics.md rule 3). */
export const MAX_PROPERTY_STRING = 128;

/** The record shape the sink receives (kept identical to the former
 * zod-inferred type — a type ALIAS so it keeps the implicit index
 * signature the console sink's Record<string, unknown> expects). */
export type ActivationEventRecord = {
  event: ActivationEvent;
  properties: Record<string, string | number>;
  ts: string;
};

/** The ONE parse boundary: returns the record, or null when the event
 * refuses (non-object input, unknown name, missing/malformed properties,
 * PII key, non-integer number, oversized or non-primitive value). Pure —
 * testable without a browser. Fail-closed: anything unexpected is null,
 * never a best-effort record (rule 6). */
export function parseActivationEvent(input: unknown): ActivationEventRecord | null {
  if (typeof input !== "object" || input === null || Array.isArray(input)) return null;
  const { event, properties, ts } = input as Record<string, unknown>;

  if (typeof event !== "string" || !ACTIVATION_EVENT_SET.has(event)) return null;
  if (typeof ts !== "string") return null;
  if (typeof properties !== "object" || properties === null || Array.isArray(properties)) return null;

  for (const [key, value] of Object.entries(properties)) {
    if (keyCarriesPii(key)) return null;
    if (typeof value === "string") {
      if (value.length > MAX_PROPERTY_STRING) return null;
    } else if (typeof value === "number") {
      if (!Number.isInteger(value)) return null;
    } else {
      return null;
    }
  }

  return { event: event as ActivationEvent, properties: properties as Record<string, string | number>, ts };
}

/** The consent storage key (docs/analytics.md). Absent = NOT granted. */
export const CONSENT_STORAGE_KEY = "rishi.analytics.consent";
export const CONSENT_GRANTED = "granted";

export function consentGrantedFrom(storageValue: string | null): boolean {
  return storageValue === CONSENT_GRANTED;
}
