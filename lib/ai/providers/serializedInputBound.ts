/**
 * W3 hard-cap semantics audit (founder round-12, directives 10 + 11):
 * the ENFORCED serialized-input bound for every provider attempt.
 *
 * The global token cap's single-request reservation
 * (GLOBAL_TOKEN_RESERVATION_CEILING in lib/chat/globalSpend.ts) estimates
 * the per-attempt input at 22,000 tokens, derived from 64,000 chars at the
 * calibrated 3 chars/token. The founder's audit (round 12) established
 * that a comment is not a bound: this module makes it one. BOTH provider
 * modules serialize their exact request body and refuse — BEFORE any
 * fetch, fail closed (Constitution rule 6) — anything beyond
 * MAX_SERIALIZED_INPUT_CHARS. A refused attempt fails over to the next
 * candidate (or 502s); it can never silently spend input tokens the
 * reservation did not cover.
 *
 * The bound is enforced on the serialized WIRE BODY (the exact payload
 * the provider receives), which includes the message JSON framing —
 * strictly tighter than bounding the content alone.
 *
 * Chars are not tokens: the 3 chars/token factor is a calibration for the
 * payload mix this system actually sends (server-built JSON/English
 * evidence and protocol blocks + short user prose). Pathological Unicode
 * (byte-fallback tokenization of rare scripts/emoji) can tokenize a
 * legal-size payload above the token estimate; the reservation/settlement
 * ledger records that honestly (settleGlobalTokens). That residual is
 * documented in the globalSpend contract — this bound is the mechanical
 * half that needs no tokenizer assumption.
 */

/** The char budget the reservation's 22,000-token input estimate derives
 *  from (64,000 chars / 3, rounded up to the round thousand). Pinned from
 *  both directions by test/globalSpendReservation.test.ts and
 *  test/w3.inputBound.test.ts. */
export const MAX_SERIALIZED_INPUT_CHARS = 64_000;

/** Thrown before the fetch when the serialized request body exceeds the
 *  bound. Name and message are matched by test/w3.inputBound.test.ts. */
export class SerializedInputBoundExceededError extends Error {
  constructor(public readonly serializedChars: number) {
    super(
      `serialized input bound exceeded: ${serializedChars} chars > ${MAX_SERIALIZED_INPUT_CHARS} — attempt refused before any provider call (fail closed)`,
    );
    this.name = "SerializedInputBoundExceededError";
  }
}

/** Refuse a serialized provider request beyond the enforced bound. */
export function assertSerializedInputWithinBound(serializedBody: string): void {
  if (serializedBody.length > MAX_SERIALIZED_INPUT_CHARS) {
    throw new SerializedInputBoundExceededError(serializedBody.length);
  }
}
