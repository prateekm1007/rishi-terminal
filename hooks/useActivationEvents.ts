"use client";

/**
 * hooks/useActivationEvents — the fail-closed consent gate for the five
 * activation events (DEMO-5, founder order 2026-10-12; G7-01).
 *
 * Contract:
 *   - consent is OFF by default; `track()` REFUSES every event until
 *     `grantConsent()` ran in this browser (rule 6: never fall through to
 *     "allowed");
 *   - refused and dropped events are visible in the structured sink as
 *     `event_refused` / `event_dropped` records — the refusal itself is
 *     auditable, the visitor's action is NOT recorded (no shadow
 *     analytics);
 *   - granted events pass the PII schema (lib/analytics/activationEvents —
 *     rule 14: ONE boundary) and land on the structured console sink as
 *     single-line JSON (ENG-5: structured logs without PII until a
 *     monitoring vendor is chosen; nothing leaves the browser);
 *   - the consent WORDING is counsel-owned (FOUNDER DECISION NEEDED) —
 *     this hook exposes the state machine only; no user-facing copy.
 *
 * The consent read uses useSyncExternalStore (no setState-in-effect — the
 * react-hooks purity rule): the module-level store notifies subscribers on
 * grant, and the server snapshot is always NOT-granted (fail-closed SSR).
 */
import { useCallback, useSyncExternalStore } from "react";
import {
  CONSENT_GRANTED,
  CONSENT_STORAGE_KEY,
  consentGrantedFrom,
  parseActivationEvent,
  type ActivationEvent,
} from "@/lib/analytics/activationEvents";

type Listener = () => void;
const listeners = new Set<Listener>();

function readConsent(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return consentGrantedFrom(window.localStorage.getItem(CONSENT_STORAGE_KEY));
  } catch {
    return false; // storage unavailable (private mode) -> fail closed
  }
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function grant(): void {
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, CONSENT_GRANTED);
  } catch {
    // storage unavailable: consent holds for this session only
  }
  for (const l of listeners) l();
}

/** The structured sink: one JSON line per record. Replace the body with
 * the vendor SDK when one is chosen (ENG-5) — the consent gate and the
 * schema above it do not change. */
function emit(record: Record<string, unknown>): void {
  console.info(JSON.stringify(record));
}

export function useActivationEvents() {
  const consentGranted = useSyncExternalStore(subscribe, readConsent, () => false);

  const grantConsent = useCallback(() => {
    grant();
  }, []);

  const track = useCallback(
    (event: ActivationEvent, properties: Record<string, string | number> = {}) => {
      if (!consentGranted) {
        emit({ event: "event_refused", refused: event, ts: new Date().toISOString() });
        return false;
      }
      const record = parseActivationEvent({
        event,
        properties,
        ts: new Date().toISOString(),
      });
      if (!record) {
        // PII or an unknown shape: dropped, never emitted
        emit({ event: "event_dropped", dropped: event, ts: new Date().toISOString() });
        return false;
      }
      emit(record);
      return true;
    },
    [consentGranted],
  );

  return { consentGranted, grantConsent, track };
}
