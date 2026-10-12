"use client";

/**
 * lib/analytics/activationEvents — the closed activation-event vocabulary
 * and the PII-refusing property schema (G7-01 + DEMO-5, founder order
 * 2026-10-12).
 *
 * Fail-closed (rule 6): the schema REFUSES unknown event names and any
 * property that carries PII (email / user id / token / password / free
 * text). The consent gate lives in hooks/useActivationEvents.ts; this
 * module is the pure boundary both the tests and the hook share (rule 14).
 *
 * No vendor: records go to the structured console sink (ENG-5 — structured
 * logs without PII until a monitoring vendor is chosen). Nothing here
 * sends anything over the network.
 */
import { z } from "zod";

/** The five activation events (docs/analytics.md — the closed union). */
export const ACTIVATION_EVENTS = [
  "search_performed",
  "stock_viewed",
  "dissent_expanded",
  "flip_expanded",
  "watchlist_added",
] as const;

export type ActivationEvent = (typeof ACTIVATION_EVENTS)[number];

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
const propertyValue = z.union([z.string().max(128), z.number().int()]);

const propertiesSchema = z
  .record(z.string(), propertyValue)
  .refine((props) => Object.keys(props).every((k) => !keyCarriesPii(k)), {
    message: "property key carries PII",
  });

export const activationEventSchema = z.object({
  event: z.enum(ACTIVATION_EVENTS),
  properties: propertiesSchema,
  ts: z.string(),
});

export type ActivationEventRecord = z.infer<typeof activationEventSchema>;

/** The ONE parse boundary: returns the record, or null when the event
 * refuses (unknown name, PII key, oversized value). Pure — testable
 * without a browser. */
export function parseActivationEvent(input: unknown): ActivationEventRecord | null {
  const r = activationEventSchema.safeParse(input);
  return r.success ? r.data : null;
}

/** The consent storage key (docs/analytics.md). Absent = NOT granted. */
export const CONSENT_STORAGE_KEY = "rishi.analytics.consent";
export const CONSENT_GRANTED = "granted";

export function consentGrantedFrom(storageValue: string | null): boolean {
  return storageValue === CONSENT_GRANTED;
}
