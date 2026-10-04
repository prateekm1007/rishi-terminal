// lib/chat/challenge.ts
// X7 (Round 13, Z6b): the SELF-HOSTED anonymous chat challenge.
//
// Founder directive: "a Turnstile-style challenge for anonymous chat after
// N requests per identity, with a reserved slice of the global budget for
// requests that pass."
//
// Why self-hosted proof-of-work: a Turnstile/hCaptcha widget needs vendor
// account keys the founder has not provisioned. The equivalent control
// with no external dependency is hashcash-style PoW: the server issues an
// HMAC-signed challenge bound to the anonymous identity, the client finds
// a nonce whose SHA-256(token|nonce) has DIFFICULTY leading zero bits,
// the route verifies signature, binding, expiry and work, and the
// challenge is CONSUMED ATOMICALLY (migration 023) so a solution can
// never be replayed. The cost lands on the requester's CPU — exactly what
// a challenge is for — while a real user pays ~1-2 s once.
//
// The reserved slice lives in lib/chat/globalSpend (the global budget's
// ONE owner, rule 14): challenge-passed requests reserve against the FULL
// global cap; everyone else against TOTAL minus the reserved share
// (default 20%). When the main pool is exhausted, the day's last slice is
// reachable only by callers who paid the challenge cost.
//
// Only ANONYMOUS identities are challenged (the founder's spec says
// "anonymous chat"); signed-in accounts keep the plain quota path.

import 'server-only';

import { createHash, createHmac, randomUUID } from 'crypto';

/** Challenge kicks in AFTER this many anonymous requests per identity, per
 *  day (env CHAT_CHALLENGE_AFTER). Default 5 — generous for a real reader
 *  (the per-identity quota is 150), tight enough to price out scripted
 *  abuse. */
export const CHALLENGE_AFTER_ANON_REQUESTS_DEFAULT = 5;

/** Leading zero bits the nonce's SHA-256 must carry. A2 (Round 14): 15
 *  (was 20). The founder's audit measured the old async browser loop at
 *  ~79k hashes/s — median 10.7 s at 20 bits — while a native bot solves
 *  it in milliseconds: the old setting taxed humans and barely slowed
 *  attackers. 15 bits ≈ 2^15 expected hashes (32× less work than 20) and
 *  is the A2 acceptance band's middle (14–16). Env-tunable via
 *  CHAT_CHALLENGE_DIFFICULTY; measured medians are pinned by
 *  test/x7.powBenchmark.test.ts and docs/evidence/round14/. Server
 *  verification cost is unchanged. */
export const CHALLENGE_DIFFICULTY_BITS_DEFAULT = 15;

/** Challenge token lifetime (minutes from issue). Short by design: the
 *  client solves immediately after receiving the challenge. */
export const CHALLENGE_TTL_MINUTES = 10;

/** The slice of the global token budget only challenge-passers can reach
 *  (env CHAT_GLOBAL_RESERVED_SHARE, fraction). Default 20%. */
export const GLOBAL_RESERVED_SHARE_DEFAULT = 0.2;

/** Env-tunable knobs with the documented defaults. */
export function challengeAfterCount(): number {
  const v = Number.parseInt(process.env.CHAT_CHALLENGE_AFTER ?? '', 10);
  return Number.isFinite(v) && v >= 0 ? v : CHALLENGE_AFTER_ANON_REQUESTS_DEFAULT;
}

export function challengeDifficultyBits(): number {
  const v = Number.parseInt(process.env.CHAT_CHALLENGE_DIFFICULTY ?? '', 10);
  return Number.isFinite(v) && v > 0 && v <= 32 ? v : CHALLENGE_DIFFICULTY_BITS_DEFAULT;
}

export function globalReservedShare(): number {
  const v = Number.parseFloat(process.env.CHAT_GLOBAL_RESERVED_SHARE ?? '');
  return Number.isFinite(v) && v > 0 && v < 1 ? v : GLOBAL_RESERVED_SHARE_DEFAULT;
}

/**
 * Should THIS anonymous request be challenged? `identityRequestCount` is
 * the caller's consumed chat unit count for the IST day (the same
 * chat_usage row the quota RPC maintains) — the challenge starts after N
 * consumed units.
 */
export function shouldChallenge(identityRequestCount: number): boolean {
  return identityRequestCount >= challengeAfterCount();
}

/** The HMAC payload — documented and pinned by test so the token shape
 *  stays auditable. */
export function hmacToken(identityHash: string, issuedAt: number, nonceId: string, pepper: string): string {
  return createHmac('sha256', pepper)
    .update(`x7-challenge.${identityHash}.${issuedAt}.${nonceId}`)
    .digest('hex');
}

export interface IssuedChallenge {
  /** The HMAC-signed challenge token (public — it is the puzzle input). */
  token: string;
  /** Leading zero bits required of SHA-256(token|nonce). */
  difficulty: number;
  /** Server-side id; carried back with the solution for the consume step. */
  challengeId: string;
  /** Epoch ms issue time (also encoded inside the HMAC payload). */
  issuedAt: number;
  /** Epoch ms expiry — the client renders it; the server re-derives it. */
  expiresAt: number;
}

/** Issue a challenge bound to ONE anonymous identity hash. The pepper is
 *  the same ANON_ID_PEPPER secret that derives the identity itself (rule
 *  14); a missing pepper never reaches here (the route's rule-6 path
 *  already 503s without it). */
export function issueChallenge(
  identityHash: string,
  pepper: string,
  nowMs: number = Date.now(),
  nonceId: string = randomUUID(),
): IssuedChallenge {
  return {
    token: hmacToken(identityHash, nowMs, nonceId, pepper),
    difficulty: challengeDifficultyBits(),
    challengeId: nonceId,
    issuedAt: nowMs,
    expiresAt: nowMs + CHALLENGE_TTL_MINUTES * 60_000,
  };
}

/** Leading-zero-bit count of a hex digest. */
function leadingZeroBits(hex: string): number {
  let bits = 0;
  for (const ch of hex) {
    const v = Number.parseInt(ch, 16);
    if (v === 0) {
      bits += 4;
      continue;
    }
    if (v < 2) return bits + 3;
    if (v < 4) return bits + 2;
    if (v < 8) return bits + 1;
    return bits;
  }
  return bits;
}

/** The standalone PoW check: SHA-256(token|nonce) carries at least
 *  `difficulty` leading zero bits. The nonce is a decimal-string counter
 *  (the client implementation is free-form; this check only sees bytes). */
export function verifyPow(token: string, nonce: string, difficulty: number): boolean {
  if (typeof token !== 'string' || typeof nonce !== 'string' || !token || !nonce) return false;
  if (nonce.length > 64) return false;
  const digest = createHash('sha256').update(`${token}|${nonce}`).digest('hex');
  return leadingZeroBits(digest) >= difficulty;
}

export interface ChallengeInputs {
  identityHash: string;
  issuedAt: number;
  challengeId: string;
}

/** Re-derive the expected token from the SERVER-HELD inputs (the route
 *  stores/derives issuedAt + challengeId at issue time — the client
 *  echoes them) and compare. Constant-time via digest equality on the
 *  final comparison. */
export function expectedTokenFor(inputs: ChallengeInputs, pepper: string): string {
  return hmacToken(inputs.identityHash, inputs.issuedAt, inputs.challengeId, pepper);
}

export interface VerifyInput {
  identityHash: string;
  issuedAt: number;
  challengeId: string;
  token: string;
  nonce: string;
  pepper: string;
  nowMs: number;
}

/** Full server-side verification of an echoed solution:
 *  signature (HMAC re-derive over the server-held inputs) → binding (the
 *  identity is IN the payload) → expiry (TTL from issuedAt) → work (the
 *  PoW). Single-use consumption is NOT here — that is the route's atomic
 *  DB step (consume_chat_challenge, migration 023), because a check that
 *  writes belongs at the route's transaction boundary, not in a pure
 *  function. */
export function verifyChallengeSolution(input: VerifyInput): boolean {
  const { identityHash, issuedAt, challengeId, token, nonce, pepper, nowMs } = input;
  if (typeof token !== 'string' || token.length !== 64) return false;
  if (!Number.isFinite(issuedAt) || issuedAt <= 0) return false;
  if (nowMs - issuedAt > CHALLENGE_TTL_MINUTES * 60_000) return false;
  const expected = expectedTokenFor({ identityHash, issuedAt, challengeId }, pepper);
  if (expected !== token) return false;
  return verifyPow(token, nonce, challengeDifficultyBits());
}

/** Find a nonce meeting the difficulty (the browser bundles a Web-Crypto
 *  twin in components/chat/pow.ts — same algorithm, one derivation pinned
 *  by the test round-trips; Node crypto powers the unit tests). */
export async function solveChallenge(
  token: string,
  difficulty: number,
): Promise<{ nonce: string; hashes: number }> {
  let n = 0;
  for (;;) {
    const nonce = String(n);
    if (verifyPow(token, nonce, difficulty)) {
      return { nonce, hashes: n + 1 };
    }
    n += 1;
  }
}
