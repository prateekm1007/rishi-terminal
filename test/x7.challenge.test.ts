// X7 (Round 13, Z6b): the anonymous chat challenge — Turnstile-style, SELF-HOSTED.
//
// Founder directive: "a Turnstile-style challenge for anonymous chat after N
// requests per identity, with a reserved slice of the global budget for
// requests that pass."
//
// No third-party vendor: a Turnstile/hCaptcha account needs founder-owned
// credentials; the sanctioned self-hosted equivalent is a hashcash-style
// PROOF OF WORK — the server issues an HMAC-signed challenge, the client
// finds a nonce whose SHA-256(token|nonce) has DIFFICULTY leading zero
// bits (~2^20 hashes ≈ 1-2 s in a browser), and the server verifies and
// CONSUMES the challenge atomically (single use, migration 023). Cost
// lands on the requester's CPU, not on a vendor contract.
//
// Contracts below are written to FAIL FIRST against the pre-X7 tree (Rule
// 21/24): the module does not exist yet. Run note in PR (X7).

import { describe, it, expect, beforeEach } from "vitest";
import { createHash, createHmac } from "crypto";

import {
  CHALLENGE_AFTER_ANON_REQUESTS_DEFAULT,
  CHALLENGE_DIFFICULTY_BITS_DEFAULT,
  GLOBAL_RESERVED_SHARE_DEFAULT,
  solveChallenge,
  verifyChallengeSolution,
  verifyPow,
  shouldChallenge,
  issueChallenge,
  expectedTokenFor,
} from "../lib/chat/challenge";
import { tokenLimitFor, GLOBAL_TOKEN_RESERVATION_CEILING } from "../lib/chat/globalSpend";

const PEPPER = "x7-test-pepper";

describe("X7 — thresholds (env-tunable, honest defaults)", () => {
  it("challenges only AFTER N anonymous requests per identity", () => {
    expect(shouldChallenge(0)).toBe(false);
    expect(shouldChallenge(3)).toBe(false);
    expect(shouldChallenge(4)).toBe(false);
    expect(shouldChallenge(5)).toBe(true);
    expect(shouldChallenge(50)).toBe(true);
  });

  it("the N threshold is the documented default (5) and env-tunable", () => {
    expect(CHALLENGE_AFTER_ANON_REQUESTS_DEFAULT).toBe(5);
    expect(CHALLENGE_DIFFICULTY_BITS_DEFAULT).toBeGreaterThan(0);
    expect(GLOBAL_RESERVED_SHARE_DEFAULT).toBeGreaterThan(0);
    expect(GLOBAL_RESERVED_SHARE_DEFAULT).toBeLessThan(1);
  });
});

describe("X7 — challenge issue/verify (HMAC-signed, single identity)", () => {
  it("issues a token that verifies with a correct nonce and binds the identity", async () => {
    const issuedAt = Date.now();
    const challenge = issueChallenge("anon-identity-1", PEPPER, issuedAt);
    expect(challenge.token).toBeTruthy();
    expect(challenge.difficulty).toBe(CHALLENGE_DIFFICULTY_BITS_DEFAULT);
    // Solve honestly (the client's job).
    const solution = await solveChallenge(challenge.token, challenge.difficulty);
    expect(
      verifyChallengeSolution({
        identityHash: "anon-identity-1",
        issuedAt,
        challengeId: challenge.challengeId,
        token: challenge.token,
        nonce: solution.nonce,
        pepper: PEPPER,
        nowMs: issuedAt + 1000,
      }),
    ).toBe(true);
  });

  it("rejects a solution for a DIFFERENT identity (token bound to its issuer)", async () => {
    const issuedAt = Date.now();
    const challenge = issueChallenge("anon-identity-1", PEPPER, issuedAt);
    const solution = await solveChallenge(challenge.token, challenge.difficulty);
    expect(
      verifyChallengeSolution({
        token: challenge.token,
        nonce: solution.nonce,
        identityHash: "anon-identity-2", // stolen solution, different identity
        issuedAt,
        challengeId: challenge.challengeId,
        pepper: PEPPER,
        nowMs: issuedAt + 1000,
      }),
    ).toBe(false);
  });

  it("rejects a FORGED token (not signed under the server pepper)", async () => {
    const forged = createHash("sha256").update("not-hmac").digest("hex");
    expect(
      verifyChallengeSolution({
        token: forged,
        nonce: "1",
        identityHash: "anon-identity-1",
        issuedAt: Date.now(),
        challengeId: "whatever",
        pepper: PEPPER,
        nowMs: Date.now(),
      }),
    ).toBe(false);
  });

  it("rejects an EXPIRED token", async () => {
    const issuedAt = Date.now();
    const challenge = issueChallenge("anon-identity-1", PEPPER, issuedAt);
    const solution = await solveChallenge(challenge.token, challenge.difficulty);
    // 30 minutes later (default TTL is 10 minutes).
    expect(
      verifyChallengeSolution({
        token: challenge.token,
        nonce: solution.nonce,
        identityHash: "anon-identity-1",
        issuedAt,
        challengeId: challenge.challengeId,
        pepper: PEPPER,
        nowMs: issuedAt + 30 * 60_000,
      }),
    ).toBe(false);
  });

  it("rejects a nonce that does not meet the difficulty", async () => {
    const issuedAt = Date.now();
    const challenge = issueChallenge("anon-identity-1", PEPPER, issuedAt);
    expect(
      verifyChallengeSolution({
        token: challenge.token,
        nonce: "not-a-valid-nonce",
        identityHash: "anon-identity-1",
        issuedAt,
        challengeId: challenge.challengeId,
        pepper: PEPPER,
        nowMs: issuedAt + 1000,
      }),
    ).toBe(false);
  });

  it("verifyPow is a standalone honest check (leading zero bits)", async () => {
    const challenge = issueChallenge("i", PEPPER, Date.now());
    const solution = await solveChallenge(challenge.token, 8);
    expect(verifyPow(challenge.token, solution.nonce, 8)).toBe(true);
    expect(verifyPow(challenge.token, solution.nonce, 200)).toBe(false);
  });

  it("the HMAC is computed over the documented payload (token shape is auditable)", () => {
    const issuedAt = 1_700_000_000_000;
    const challenge = issueChallenge("i-1", PEPPER, issuedAt, "fixed-nonce-id");
    const expected = createHmac("sha256", PEPPER)
      .update(`x7-challenge.i-1.${issuedAt}.fixed-nonce-id`)
      .digest("hex");
    expect(challenge.token).toBe(expected);
  });
});

describe("X7 — the reserved slice of the global budget (pure math, globalSpend owns it)", () => {
  it("normal requests reserve against TOTAL minus the reserved slice (20% default)", () => {
    expect(tokenLimitFor(false, 1_000_000, 0.2)).toBe(800_000);
  });

  it("challenge-passed requests reserve against the FULL total", () => {
    expect(tokenLimitFor(true, 1_000_000, 0.2)).toBe(1_000_000);
  });

  it("the production constants stay sane: ceiling fits, share in (0,1)", () => {
    expect(GLOBAL_TOKEN_RESERVATION_CEILING).toBe(288_576);
    expect(tokenLimitFor(false, CHALLENGE_AFTER_ANON_REQUESTS_DEFAULT, 0.2)).toBeLessThan(
      CHALLENGE_AFTER_ANON_REQUESTS_DEFAULT,
    );
    expect(GLOBAL_RESERVED_SHARE_DEFAULT).toBe(0.2);
  });

  it("a degenerate share (>= 1) clamps to a zero main limit — fail closed, not negative", () => {
    expect(tokenLimitFor(false, 100, 0.99)).toBe(1);
    expect(tokenLimitFor(false, 100, 1)).toBe(0);
  });
});

describe("X7 — server-side signature re-derivation (the route's verify step)", () => {
  it("expectedTokenFor reproduces the issued token (binding is auditable)", () => {
    const issuedAt = 1_700_000_000_000;
    const challenge = issueChallenge("i-1", PEPPER, issuedAt, "nonce-1");
    expect(expectedTokenFor({ identityHash: "i-1", issuedAt, challengeId: "nonce-1" }, PEPPER)).toBe(
      challenge.token,
    );
  });

  it("verifyChallengeSolution binds signature + expiry + work end-to-end", async () => {
    const issuedAt = Date.now();
    const challenge = issueChallenge("i-9", PEPPER, issuedAt);
    const solution = await solveChallenge(challenge.token, challenge.difficulty);
    expect(
      verifyChallengeSolution({
        identityHash: "i-9",
        issuedAt,
        challengeId: challenge.challengeId,
        token: challenge.token,
        nonce: solution.nonce,
        pepper: PEPPER,
        nowMs: issuedAt + 60_000,
      }),
    ).toBe(true);
    // expired
    expect(
      verifyChallengeSolution({
        identityHash: "i-9",
        issuedAt,
        challengeId: challenge.challengeId,
        token: challenge.token,
        nonce: solution.nonce,
        pepper: PEPPER,
        nowMs: issuedAt + 11 * 60_000,
      }),
    ).toBe(false);
    // wrong identity (stolen solution)
    expect(
      verifyChallengeSolution({
        identityHash: "i-OTHER",
        issuedAt,
        challengeId: challenge.challengeId,
        token: challenge.token,
        nonce: solution.nonce,
        pepper: PEPPER,
        nowMs: issuedAt + 60_000,
      }),
    ).toBe(false);
  });
});
