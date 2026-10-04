// components/chat/pow.ts
// X7 (Round 13, Z6b) + A2 (Round 14): the browser twin of lib/chat/challenge.ts's
// PoW check.
//
// ONE derivation, three runtimes (Rule 14): the server verifies with Node
// crypto (pinned by test/x7.challenge.test.ts round-trips); the browser
// solves in public/pow.worker.js — a classic Web Worker running a
// SYNCHRONOUS SHA-256 (no await per hash) whose digests are pinned
// byte-for-byte against Node crypto by test/x7.powBenchmark.test.ts.
// The A2 audit: the old async loop (~79k hashes/s, one `await` per hash)
// medians 10.7 s at difficulty 20 — taxing humans while a native bot
// solves it in milliseconds. The worker + the A2 difficulty band fixes
// the human cost; the server's single-use consume still prices bots.
//
// Protocol (public/pow.worker.js):
//   in:  { type: 'solve', token, difficulty }
//   out: { type: 'progress', hashes }
//        { type: 'done', nonce, hashes, elapsedMs }
//        { type: 'error', message }

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

/** Progress reported by the worker (throttled to ~10 messages/s inside the
 *  worker): the count of hashes tried so far. `required` is the EXPECTED
 *  work (2^difficulty) — a statistical denominator for the UI bar, not a
 *  cap; a lucky nonce can arrive before it, an unlucky one after. */
export interface PowProgress {
  hashes: number;
  required: number;
}

/** The solve timeout (ms). The challenge TTL is 10 minutes, but a human
 *  waiting on a stuck solver is a lost human: A2 gives the worker 15 s,
 *  then terminates it and surfaces a clear retry message (rule 3 — say
 *  what happened; never a silent hang). */
export const POW_SOLVE_TIMEOUT_MS = 15_000;

/** Find a nonce for the token meeting the difficulty.
 *  A2: runs in a Web Worker (synchronous hashing off the main thread) with
 *  progress + timeout; when `Worker` is unavailable (very old browsers,
 *  non-browser runtimes) it falls back to the original cooperative async
 *  loop — same algorithm, same digests, just slower, and it never ships
 *  progress. */
export async function solvePow(
  token: string,
  difficulty: number,
  onProgress?: (progress: PowProgress) => void,
): Promise<PowSolution> {
  const required = Math.pow(2, difficulty);
  if (typeof Worker !== 'undefined') {
    return solveWithWorker(token, difficulty, required, onProgress);
  }
  return solveCooperative(token, difficulty, onProgress ? p => onProgress({ hashes: p, required }) : undefined);
}

function solveWithWorker(
  token: string,
  difficulty: number,
  required: number,
  onProgress?: (progress: PowProgress) => void,
): Promise<PowSolution> {
  return new Promise<PowSolution>((resolve, reject) => {
    let worker: Worker;
    try {
      worker = new Worker('/pow.worker.js');
    } catch {
      // A Content-Security-Policy or construction failure must not take the
      // chat down — degrade to the cooperative loop (rule 6 is for secrets;
      // here the honest equivalent is "still works, just slower").
      solveCooperative(token, difficulty).then(resolve, reject);
      return;
    }

    const timer = setTimeout(() => {
      worker.terminate();
      reject(new Error('POW_TIMEOUT'));
    }, POW_SOLVE_TIMEOUT_MS);

    worker.onmessage = (event: MessageEvent) => {
      const data = event.data as
        | { type: 'progress'; hashes: number }
        | { type: 'done'; nonce: string; hashes: number }
        | { type: 'error'; message: string };
      if (data.type === 'progress') {
        onProgress?.({ hashes: data.hashes, required });
        return;
      }
      clearTimeout(timer);
      worker.terminate();
      if (data.type === 'done') {
        resolve({ nonce: data.nonce, hashes: data.hashes });
      } else {
        reject(new Error(data.message || 'POW_WORKER_ERROR'));
      }
    };
    worker.onerror = () => {
      clearTimeout(timer);
      worker.terminate();
      reject(new Error('POW_WORKER_ERROR'));
    };

    worker.postMessage({ type: 'solve', token, difficulty });
  });
}

/** The original cooperative loop (kept for the no-Worker fallback and
 *  referenced by the pre-A2 round-trip tests). Yields to the event loop
 *  every 256 attempts to keep the UI responsive. */
async function solveCooperative(
  token: string,
  difficulty: number,
  onProgress?: (hashes: number) => void,
): Promise<PowSolution> {
  let n = 0;
  for (;;) {
    const nonce = String(n);
    const hex = await sha256Hex(`${token}|${nonce}`);
    if (leadingZeroBits(hex) >= difficulty) {
      return { nonce, hashes: n + 1 };
    }
    n += 1;
    if (n % 256 === 0) {
      if (onProgress) onProgress(n);
      await new Promise(r => setTimeout(r, 0));
    }
  }
}
