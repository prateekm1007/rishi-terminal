# B4 — the 200 kB stock-page budget: a measurement defect, not a weight problem (Round 15)

Evidence for the B4 PR. All measurements 2026-10-04 22:55–23:05 UTC on a
clean `npm run build` of `origin/main` @ 68c6ce6 (post-B1-merge).

## 1. What the 11 scripts actually are (the founder's "check what the 11 scripts contain")

Per-chunk analysis (`node scripts/measureStockChunks.mjs` + content
fingerprinting of each chunk):

| gzip kB | chunk | content |
|---|---|---|
| 69.3 | 0jj-… | react-dom + scheduler (framework) |
| 38.7 | 03~… | **core-js v3.38.1 polyfill bundle — Next's `polyfill-nomodule`, `noModule` tag** |
| 37.5 | 1418… | Next client runtime (deployment id / asset token / router utils) |
| 12.6 | 0eew… | Next client router runtime |
| 10.6 | 0gq… | app shell: language provider, theme, shared components |
| 10.6 | 0~… | **StockPageClient + the A1 content components** (first-byte content) |
| 9.3 | 1396… | Next error/router bits + process shim |
| 9.0 | 0fro… | Next server-component client runtime |
| 5.3 | 12dis… | price-presentation lib |
| 4.1 | turbopack-… | Turbopack runtime |
| 0.6 | 10kzy… | stock error boundary |

Framework + runtime + polyfills = 180.5 kB; ALL app code = 27.1 kB. The
charts, radar and grid are ALREADY lazy (`ssr:false` dynamics) and are not
in the first-load set — the founder's lazy-loading candidates were already
exhausted by the Z5/A1 work.

## 2. The defect: the gate counted a script no supported browser downloads

The 38.7 kB chunk is emitted with a `noModule` attribute:

```text
$ python3 - (script-tag dump of .next/server/app/stock/SBIN.html)
<script src="/_next/static/chunks/03~yq9q893hmn.js" noModule="">
```

Next 16's supported-browsers matrix is Chrome/Edge/Firefox 111+ and Safari
16.4+ (`node_modules/next/dist/docs/03-architecture/supported-browsers.md`);
the docs state these polyfills load "only for browsers that require them".
The gate's own docstring says it measures "the script tags the browser
actually downloads for first load" — counting a `nomodule` script
contradicted its own definition and overstated first-load by 38.7 kB.

## 3. Browser-verified ground truth (the fail-first witness)

`/home/z/my-project/scripts/b4-browser-truth.cjs` — real Chromium
(Playwright), network response capture, `waitUntil: 'load'`:

```text
=== /stock/SBIN ===
  (10 js files requested; 03~yq9q893hmn.js ABSENT — never requested)
  222.2 kB (wire)  0jj-c5u81.ukf.js      <- raw sizes; next start served uncompressed
  137.5 kB (wire)  1418zeo~efs14.js
  ... (8 more; no polyfill chunk)
=== /screener ===  8 files, polyfill ABSENT
=== /            ===  12 files, polyfill ABSENT
```

The gate said 11 scripts / 207.6 kB for /stock; Chromium downloads
10 scripts. That contradiction IS the fail-first: the gate's number did
not match the user-facing metric (C10/B-19 class).

## 4. The fix and the passing run

`scripts/bundleBudget.ts` now extracts first-load chunk srcs from
`<script>` tags while excluding `noModule` ones (case-insensitive — React
SSR emits `noModule`, the DOM normalizes `nomodule`).
`scripts/measureStockChunks.mjs` (analysis helper) updated identically.

The ratchet baseline file is REMOVED: the founder's Round-15 B4 directive
("Reduce /stock/[symbol] to ≤ 200 kB gzip") confirms the roadmap budgets,
so the hard 200 kB gates are now the fatal check (the script's own
documented end-state: "A founder-confirmed budget replaces the ratchet").

```text
$ npx tsx scripts/bundleBudget.ts
── bundleBudget (200 kB budgets — founder-confirmed in Round-15 B4; first-load = scripts a module-capable browser downloads, nomodule polyfills excluded) ──
route                first-load   budget   ratchet   verdict
/                       158.7 kB    200 kB     — kB   OK  (8 scripts)
/screener               161.7 kB    200 kB     — kB   OK  (8 scripts)
/stock/[symbol]         168.9 kB    200 kB     — kB   OK  (10 scripts)
EXIT 0
```

## 5. The fixed gate still bites (rule 24)

Scratch edit `/stock/[symbol]` budget 200 → 160 on the working tree, same
build:

```text
/stock/[symbol]         168.9 kB    160 kB     — kB   over proposed budget  (10 scripts)
EXIT 1
```

Budget restored (the committed diff contains only the measurement fix).

## 6. The C9 guard: content still in the first byte

```text
$ BASE_URL=http://localhost:3212 npx playwright test ssr-content
  ✓  stock page serves the content sections in the raw SSR HTML
  ✓  Y4 null-not-zero holds in the SSR HTML of a bank page (positive + negative control)
  2 passed
```

No app code changed in this PR — the content components are untouched
(the 27.1 kB of app JS above includes them; nothing moved out of SSR).

## 7. Resolution of the registered FOUNDER DECISION (A1 register row)

The A1-era decision request ("accept ~207 kB or approve a deeper
refactor") is superseded by this finding: neither is needed. The page
was never over the user-facing budget; the gate over-counted. The
recommended number stays 200 kB (roadmap value), now enforced as a hard
gate with ~31 kB headroom on /stock.
