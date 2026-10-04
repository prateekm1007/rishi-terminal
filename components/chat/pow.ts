// components/chat/pow.ts
// X7 (Round 13, Z6b): the browser twin of lib/chat/challenge.ts's PoW check.
//
// ONE derivation, two runtimes (Rule 14): the server verifies with Node
// crypto (pinned by test/x7.challenge.test.ts round-trips against this
// exact algorithm — SHA-256 over `${token}|${nonce}`, leading zero bits);
// the browser runs the same check with Web Crypto while SOLVING. The
// round-trip tests prove the two shapes agree: a nonce found here passes
// the server's verifyChallengeSolution.
//
// Difficulty 20 ≈ 2^20 expected hashes ≈ 1-2 s of browser work — the cost
// a challenge is supposed to buy.

'use client';

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function leadingZeroBits(hex: string): number {
  let bits = 0;
  for (const ch of hex) {
    const v = parseInt(ch, 16);
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

export interface PowSolution {
  nonce: string;
  hashes: number;
}

/** Find a nonce for the token meeting the difficulty. Awaiting inside the
 *  loop every 256 attempts keeps the UI responsive without a worker. */
export async function solvePow(token: string, difficulty: number): Promise<PowSolution> {
  let n = 0;
  for (;;) {
    const nonce = String(n);
    const hex = await sha256Hex(`${token}|${nonce}`);
    if (leadingZeroBits(hex) >= difficulty) {
      return { nonce, hashes: n + 1 };
    }
    n += 1;
    if (n % 256 === 0) await new Promise(r => setTimeout(r, 0));
  }
}
