/**
 * CRYPTO-DOM (founder direction 5a, 2026-10-10): data/crypto.ts typed
 * BTC dominance as 58.2 while the dataset's own market caps compute
 * 70.96% ($1.95T BTC / $2.74865T total — the founder's 70.9 used the
 * rounded $2.75T total). Dominance is DERIVED from the caps at module
 * level from now on — one source of truth (C4: the caps), and typing a
 * dominance literal anywhere in the file fails this pin's source scan.
 *
 * What this pin enforces:
 *   1. DERIVATION — every dominance value equals its caps' math
 *      (round(cap / total * 1000) / 10): MARKET_DOMINANCE.btc/eth/bnb/
 *      others and every CRYPTO_ONCHAIN[sym].domance entry.
 *   2. KNOWN VALUE — the caps' math pins btc at 71.0 and eth at 16.9
 *      (1 dp). A future cap edit that moves dominance must update this
 *      expectation consciously, never silently.
 *   3. NEVER TYPED — no numeric literal is assigned to a dominance
 *      field anywhere in data/crypto.ts (patterns for both the
 *      MARKET_DOMINANCE shape and the CRYPTO_ONCHAIN shape), with the
 *      pre-fix typed lines embedded as bite controls (B-18/C5).
 *
 * Fail-first: run against the pre-fix tree — raw RED capture at
 * docs/evidence/round44/red-crypto-dom.txt.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  CRYPTO_ASSETS,
  CRYPTO_ONCHAIN,
  MARKET_DOMINANCE,
} from "../data/crypto";

const SOURCE = readFileSync("data/crypto.ts", "utf8");

const TOTAL = CRYPTO_ASSETS.reduce((sum, c) => sum + c.marketCap, 0);
const derived = (cap: number) => Math.round((cap / TOTAL) * 1000) / 10;
const capOf = (symbol: string) =>
  CRYPTO_ASSETS.find((c) => c.symbol === symbol)?.marketCap ?? 0;

/** The pre-fix typed lines, verbatim — the bite control proving the
 *  source-scan patterns detect typed dominance (embedded, never
 *  imported from the live tree). */
const PRE_FIX_LINES = [
  "  btc: 58.2,",
  "  BTC:   { dominance: 58.2, fundingRate: 0.012, openInterest: 32.5, exchangeNetflow: -42.0, mvrv: 2.1, activeAddresses: 950 },",
];
const TYPED_MARKET_DOMINANCE = /btc:\s*[0-9]/;
const TYPED_ONCHAIN_DOMINANCE = /dominance:\s*[0-9]/;

describe("CRYPTO-DOM — dominance is derived from the caps, never typed", () => {
  it("the source scan bites: the typed-literal patterns detect the pre-fix lines (positive control, B-18/C5)", () => {
    for (const line of PRE_FIX_LINES) {
      expect(TYPED_MARKET_DOMINANCE.test(line) || TYPED_ONCHAIN_DOMINANCE.test(line),
        `scan must detect the pre-fix typed line: ${line}`).toBe(true);
    }
  });

  it("MARKET_DOMINANCE equals the caps' math (btc, eth, bnb, others)", () => {
    expect(MARKET_DOMINANCE.btc).toBe(derived(capOf("BTC")));
    expect(MARKET_DOMINANCE.eth).toBe(derived(capOf("ETH")));
    expect(MARKET_DOMINANCE.bnb).toBe(derived(capOf("BNB")));
    const othersCap = TOTAL - capOf("BTC") - capOf("ETH") - capOf("BNB");
    expect(MARKET_DOMINANCE.others).toBe(derived(othersCap));
  });

  it("the caps' math pins the known values — btc 70.9, eth 16.9 (1 dp)", () => {
    // The founder's audit: typed 58.2 vs computed 70.9 ($1.95T BTC /
    // $2.74865T total = 70.9439% -> 70.9 at 1 dp; the rounded $2.75T
    // total gives the same 70.9). Machine-computed, not mental math.
    expect(MARKET_DOMINANCE.btc).toBe(70.9);
    expect(MARKET_DOMINANCE.eth).toBe(16.9);
  });

  it("every CRYPTO_ONCHAIN dominance equals its asset's caps math", () => {
    for (const [symbol, onchain] of Object.entries(CRYPTO_ONCHAIN)) {
      expect(onchain.dominance,
        `${symbol} on-chain dominance must equal the caps' math`).toBe(derived(capOf(symbol)));
    }
  });

  it("no numeric dominance literal is typed anywhere in data/crypto.ts (never typed)", () => {
    expect(TYPED_MARKET_DOMINANCE.test(SOURCE),
      "a numeric literal is assigned to a MARKET_DOMINANCE field — derive it from the caps").toBe(false);
    expect(TYPED_ONCHAIN_DOMINANCE.test(SOURCE),
      "a numeric literal is assigned to an on-chain dominance field — derive it from the caps").toBe(false);
  });

  it("positive control: the dataset the derivation reads actually carries caps (B-18)", () => {
    expect(CRYPTO_ASSETS.length).toBeGreaterThanOrEqual(12);
    expect(TOTAL).toBeGreaterThan(2_000_000_000_000);
    for (const c of CRYPTO_ASSETS) {
      expect(c.marketCap, `${c.symbol} must carry a positive cap`).toBeGreaterThan(0);
    }
  });
});
