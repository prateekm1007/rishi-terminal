import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  CHALLENGE_DIFFICULTY_BITS_DEFAULT,
  challengeDifficultyBits,
  verifyPow,
} from "../lib/chat/challenge";

// A2 (Round 14): the chat challenge must be solvable by a HUMAN. The
// founder's audit measured the shipping solver (async Web Crypto loop,
// one `await` per hash) at ~79k hashes/s — median 10.7 s at difficulty 20 —
// while a native bot solves it in milliseconds. The fix: difficulty 14–16
// and a Web Worker running a SYNCHRONOUS SHA-256 (no await per hash).
//
// This file pins both halves of the acceptance:
//   1. the shipped worker file's digests are byte-identical to Node's
//      SHA-256 (one derivation — a nonce it finds ALWAYS passes the
//      server's verifyPow), and
//   2. the median solve time at the chosen default difficulty is under
//      2 s in this benchmark harness (the founder's acceptance verbatim).

const require = createRequire(import.meta.url);
const workerPath = path.join(process.cwd(), "public", "pow.worker.js");
const worker = require(workerPath) as {
  sha256HexSync: (input: string) => string;
  leadingZeroBits: (digest: Uint8Array) => number;
  solve: (
    token: string,
    difficulty: number,
    onProgress?: (hashes: number) => void,
  ) => { nonce: string; hashes: number };
};

describe("A2 — the worker solver is the same math the server verifies", () => {
  it("produces SHA-256 digests byte-identical to Node crypto (200 mixed inputs)", () => {
    const inputs: string[] = ["", "a", "x7-challenge|0", "A".repeat(63), "B".repeat(64), "C".repeat(65), "∈Unicode ∑ samples", "D".repeat(1000)];
    for (let i = 0; i < 200; i++) {
      inputs.push(`${i}:${Math.random().toString(36).slice(2)}|${i * 7}`);
    }
    for (const input of inputs) {
      const expected = createHash("sha256").update(input).digest("hex");
      expect(worker.sha256HexSync(input)).toBe(expected);
    }
  });

  it("a nonce found by the worker passes the server's verifyPow (round-trip)", () => {
    const token = createHash("sha256").update("issue-" + Date.now()).digest("hex");
    const res = worker.solve(token, 12); // low difficulty keeps the round-trip fast
    expect(res.hashes).toBeGreaterThan(0);
    expect(verifyPow(token, res.nonce, 12)).toBe(true);
  });

  it("a WRONG nonce never passes (the check is real, not decorative)", () => {
    const token = createHash("sha256").update("issue-2").digest("hex");
    expect(verifyPow(token, "not-a-solution", 12)).toBe(false);
  });
});

describe("A2 — the chosen difficulty is human-solvable", () => {
  it("the default difficulty is the founder's 14–16 band (15)", () => {
    expect(CHALLENGE_DIFFICULTY_BITS_DEFAULT).toBe(15);
  });

  it("median solve time at the chosen difficulty is under 2 s (benchmark)", () => {
    const source = readFileSync(workerPath, "utf8");
    expect(source).toContain("sha256"); // the harness measures the real shipped file
    const token = createHash("sha256").update("a2-benchmark").digest("hex");
    const difficulty = challengeDifficultyBits(); // the knob the server actually issues with
    const runs: number[] = [];
    for (let i = 0; i < 11; i++) {
      const startedAt = process.hrtime.bigint();
      worker.solve(token, difficulty);
      runs.push(Number(process.hrtime.bigint() - startedAt) / 1e6);
    }
    runs.sort((a, b) => a - b);
    const median = runs[Math.floor(runs.length / 2)];
    const p95 = runs[Math.min(runs.length - 1, Math.ceil(runs.length * 0.95) - 1)];
    console.log(`[a2-benchmark] runs=${runs.map(r => r.toFixed(1)).join(", ")} ms | median=${median.toFixed(1)} ms | p95=${p95.toFixed(1)} ms @ ${difficulty} bits`);
    expect(median).toBeLessThan(2_000);
  });
});
