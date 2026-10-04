// public/pow.worker.js — X7/A2 (Round 14): the chat challenge's proof-of-work
// solver, running as a classic Web Worker so the SHA-256 loop never blocks
// the page (the A2 audit: the old async main-thread loop awaited per hash —
// ~79k hashes/s, median 10.7 s at difficulty 20 — taxing humans, not bots).
//
// ONE derivation (Rule 14): this file is the single source of the client
// solver. The browser loads it as a Worker (`new Worker('/pow.worker.js')`,
// protocol below); Node tests require it as a CommonJS module and pin the
// digests byte-for-byte against lib/chat/challenge.ts's Node-crypto
// verifier, so a nonce found here always passes verifyChallengeSolution.
//
// Algorithm (identical to the server): SHA-256 over `${token}|${nonce}`,
// decimal-string nonce starting at 0, accepted when the digest carries at
// least `difficulty` leading zero bits (MSB-first). Progress messages are
// throttled to ~10/s so React state updates stay cheap.
//
// Worker protocol:
//   in:  { type: 'solve', token: string, difficulty: number }
//   out: { type: 'progress', hashes: number }
//        { type: 'done', nonce: string, hashes: number, elapsedMs: number }
//        { type: 'error', message: string }


(function () {
  'use strict';

  // ── SHA-256 core (synchronous, byte-oriented, no awaits) ──
  // FIPS 180-4 constants. Preallocated state so the solve loop allocates
  // nothing per hash beyond the message buffer (reused across iterations).
  var K = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ]);

  var w = new Uint32Array(64);
  var hView = new Uint32Array(8);

  /** SHA-256 of `bytes[0..length)` → 32-byte digest (into `out`, or a fresh
   *  buffer when omitted). Synchronous by design: the solve loop must not
   *  await (A2). */
  function sha256(bytes, length, out) {
    var h = hView;
    h[0] = 0x6a09e667; h[1] = 0xbb67ae85; h[2] = 0x3c6ef372; h[3] = 0xa54ff53a;
    h[4] = 0x510e527f; h[5] = 0x9b05688c; h[6] = 0x1f83d9ab; h[7] = 0x5be0cd19;

    var bitLen = length * 8;
    var padded = ((length + 9 + 63) >> 6) << 6; // total padded byte length
    var i;

    // Reuse a module-level scratch big enough for our messages (the nonce
    // adds ≤ 20 bytes over the prefix; challenge tokens are 64 hex chars →
    // prefix 66 bytes → ≤ 86 bytes → one block + padding ≤ 128). Guarded
    // anyway so ANY caller size stays correct.
    if (!sha256._buf || sha256._buf.length < padded) sha256._buf = new Uint8Array(padded);
    var buf = sha256._buf;
    buf.set(bytes.subarray(0, length));
    buf[length] = 0x80;
    for (i = length + 1; i < padded; i++) buf[i] = 0;
    // big-endian bit length in the final 8 bytes
    buf[padded - 4] = (bitLen >>> 24) & 0xff;
    buf[padded - 3] = (bitLen >>> 16) & 0xff;
    buf[padded - 2] = (bitLen >>> 8) & 0xff;
    buf[padded - 1] = bitLen & 0xff;

    for (var off = 0; off < padded; off += 64) {
      for (i = 0; i < 16; i++) {
        var j = off + i * 4;
        w[i] = (buf[j] << 24) | (buf[j + 1] << 16) | (buf[j + 2] << 8) | buf[j + 3];
      }
      for (i = 16; i < 64; i++) {
        var x = w[i - 15], y = w[i - 2];
        var s0 = ((x >>> 7) | (x << 25)) ^ ((x >>> 18) | (x << 14)) ^ (x >>> 3);
        var s1 = ((y >>> 17) | (y << 15)) ^ ((y >>> 19) | (y << 13)) ^ (y >>> 10);
        w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
      }
      var a = h[0], b = h[1], c = h[2], d = h[3], e = h[4], f = h[5], g = h[6], hh = h[7];
      for (i = 0; i < 64; i++) {
        var S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
        var ch = (e & f) ^ (~e & g);
        var t1 = (hh + S1 + ch + K[i] + w[i]) | 0;
        var S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
        var mj = (a & b) ^ (a & c) ^ (b & c);
        var t2 = (S0 + mj) | 0;
        hh = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
      }
      h[0] = (h[0] + a) | 0; h[1] = (h[1] + b) | 0; h[2] = (h[2] + c) | 0; h[3] = (h[3] + d) | 0;
      h[4] = (h[4] + e) | 0; h[5] = (h[5] + f) | 0; h[6] = (h[6] + g) | 0; h[7] = (h[7] + hh) | 0;
    }

    out = out || new Uint8Array(32);
    for (i = 0; i < 8; i++) {
      out[i * 4] = (h[i] >>> 24) & 0xff;
      out[i * 4 + 1] = (h[i] >>> 16) & 0xff;
      out[i * 4 + 2] = (h[i] >>> 8) & 0xff;
      out[i * 4 + 3] = h[i] & 0xff;
    }
    return out;
  }

  function utf8Encode(str) {
    // TextEncoder is available in browsers, workers AND Node ≥ 11 — the
    // one canonical encoder everywhere (no hand-rolled UTF-8).
    return new TextEncoder().encode(str);
  }

  /** MSB-first leading-zero-bit count — must agree with lib/chat/challenge.ts. */
  function leadingZeroBits(digest) {
    var bits = 0;
    for (var i = 0; i < 32; i++) {
      var b = digest[i];
      if (b === 0) { bits += 8; continue; }
      if (b < 2) return bits + 7;
      if (b < 4) return bits + 6;
      if (b < 8) return bits + 5;
      if (b < 16) return bits + 4;
      if (b < 32) return bits + 3;
      if (b < 64) return bits + 2;
      if (b < 128) return bits + 1;
      return bits;
    }
    return bits;
  }

  /** Solve loop: synchronous hashing, no awaits, progress callback every
   *  4096 hashes. Returns { nonce, hashes }. */
  function solve(token, difficulty, onProgress) {
    if (typeof token !== 'string' || !token) throw new Error('bad token');
    if (!Number.isInteger(difficulty) || difficulty < 1 || difficulty > 64) throw new Error('bad difficulty');
    var prefix = utf8Encode(token + '|');
    var maxNonceLen = 20; // decimal counter will never exceed 20 digits here
    var msg = new Uint8Array(prefix.length + maxNonceLen);
    msg.set(prefix);
    var digest = new Uint8Array(32);
    var plen = prefix.length;

    for (var n = 0; ; n++) {
      var nonce = String(n);
      var len = plen + nonce.length;
      for (var i = 0; i < nonce.length; i++) msg[plen + i] = nonce.charCodeAt(i);
      sha256(msg, len, digest);
      if (leadingZeroBits(digest) >= difficulty) {
        return { nonce: nonce, hashes: n + 1 };
      }
      if (onProgress && (n & 4095) === 4095) onProgress(n + 1);
    }
  }

  // ── Worker environment ──
  // importScripts exists only inside workers; `module` only in Node — the
  // guards keep this file dual-mode without cross-contaminating either.
  if (typeof importScripts === 'function' && typeof self !== 'undefined') {
    self.onmessage = function (e) {
      var data = e.data || {};
      if (data.type !== 'solve') return;
      var startedAt = Date.now();
      var lastPost = 0;
      try {
        var res = solve(data.token, data.difficulty, function (hashes) {
          var now = Date.now();
          if (now - lastPost >= 100) {
            lastPost = now;
            self.postMessage({ type: 'progress', hashes: hashes });
          }
        });
        self.postMessage({ type: 'done', nonce: res.nonce, hashes: res.hashes, elapsedMs: Date.now() - startedAt });
      } catch (err) {
        self.postMessage({ type: 'error', message: String(err && err.message ? err.message : err) });
      }
    };
  }

  // ── Node (test harness) environment ──
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      sha256HexSync: function (input) {
        var bytes = utf8Encode(input);
        var d = sha256(bytes, bytes.length);
        var hex = '';
        for (var i = 0; i < 32; i++) hex += (d[i] >>> 4).toString(16) + (d[i] & 15).toString(16);
        return hex;
      },
      leadingZeroBits: leadingZeroBits,
      solve: solve,
      utf8Encode: utf8Encode,
    };
  }
})();
