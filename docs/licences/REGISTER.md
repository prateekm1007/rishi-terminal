# Dependency licence register (A3 — founder order, 12 Oct 2026)

One row per dependency, generated 2026-10-12 from
`npx -y license-checker@25.0.1 --production/--development --json`
(license-checker works on this tree — no alternative needed) plus
package.json direct markers. Method:
- `use` = tree membership (runtime = production tree, dev = dev-only
  tree). Transitive build-time chains inside the production tree
  (e.g. via `@next/bundle-analyzer`) are marked runtime transitive —
  the licence gate (A2) enforces on the same tree, so the register and
  the gate cannot disagree about scope.
- `touches third-party data` = the package itself calls a vendor data
  endpoint. None do (all NSE/BSE/Yahoo/CoinGecko calls are first-party
  code in `lib/`, inventoried in UNOFFICIAL_SOURCES.md); the Supabase
  clients connect to the first-party project from env.
- `attribution required` = yes only where the licence demands more
  than the distributed licence text (CC-BY-4.0).
- `clauses` = the constitution rule governing third-party code
  (rule 31: vendor selection is founder-escalated).
- The repo itself (`rishi-terminal@0.1.0`, reported UNLICENSED by the
  scanner) is NOT a third-party dependency and has no row. Choosing a
  licence for the product is a legal decision — NOT made here (rule 31);
  flagged to the founder.
- C11 flag (rule 28): the order asks for "the constitution clauses
  (C11)". No C11 exists — the constitution's Core is C1–C10. This column
  cites the closest existing rules. If C11 was meant as a NEW dependency-
  hygiene clause, proposing it needs founder approval in a PR thread
  (ratification rule); nothing here invents one.

## Exceptions (outside the A2 allowlist — recorded, not hidden)

| package | licence | disposition |
|---|---|---|
| @img/sharp-win32-x64 0.34.5 (via next → sharp) | Apache-2.0 AND LGPL-3.0-or-later | EXCEPTION pending A1: platform image binary + libvips. Re-evaluate on the Next 16.4 upgrade (dep chain may change). Weak copyleft is file-level; nothing links libvips into app code. |
| caniuse-lite 1.0.30001792 (via next, eslint-config-next) | CC-BY-4.0 | ACCEPTED with attribution retained (BY notice ships in the npm package; built CSS does not reproduce the dataset). |
| opener 1.5.2 (via @next/bundle-analyzer → webpack-bundle-analyzer) | WTFPL OR MIT | ACCEPTED under the MIT grant (dual licence, MIT elected and recorded here). Build-time only, never shipped. |
| axe-core / @axe-core/playwright / lightningcss 4.13.0 / 1.33.0 (dev) | MPL-2.0 | ACCEPTED: weak copyleft, dev/build-only, never shipped. In the A2 allowlist as specified. |

No GPL, AGPL, LGPL (standalone), CDDL, EPL, or Commons-Clause package
anywhere in either tree. No "No licence" package except the repo itself.

## Rows (535: 97 production tree + 438 dev-only)

| name | version | SPDX licence | use | touches third-party data | attribution required | source URL | date reviewed | clauses |
|---|---|---|---|---|---|---|---|---|
| @discoveryjs/json-ext | 0.5.7 | MIT | runtime transitive | no (local compute/render/build only) | no | https://github.com/discoveryjs/json-ext | 2026-10-12 | rule 31 |
| @img/colour | 1.1.0 | MIT | runtime transitive | no (local compute/render/build only) | no | https://github.com/lovell/colour | 2026-10-12 | rule 31 |
| @img/sharp-win32-x64 | 0.34.5 | Apache-2.0 AND LGPL-3.0-or-later | runtime transitive | no (local compute/render/build only) | no | https://github.com/lovell/sharp | 2026-10-12 | rule 31 |
| @next/bundle-analyzer | 16.3.8 | MIT | runtime direct | no (local compute/render/build only) | no | https://github.com/vercel/next.js | 2026-10-12 | rule 31 |
| @next/env | 16.2.4 | MIT | runtime transitive | no (local compute/render/build only) | no | https://github.com/vercel/next.js | 2026-10-12 | rule 31 |
| @next/swc-win32-x64-msvc | 16.2.4 | MIT | runtime transitive | no (local compute/render/build only) | no | https://github.com/vercel/next.js | 2026-10-12 | rule 31 |
| @opentelemetry/api | 1.9.1 | Apache-2.0 | runtime transitive | no (local compute/render/build only) | no | https://github.com/open-telemetry/opentelemetry-js | 2026-10-12 | rule 31 |
| @playwright/test | 1.63.0 | Apache-2.0 | runtime transitive | no (local compute/render/build only) | no | https://github.com/microsoft/playwright | 2026-10-12 | rule 31 |
| @polka/url | 1.0.0-next.29 | MIT | runtime transitive | no (local compute/render/build only) | no | https://github.com/lukeed/polka | 2026-10-12 | rule 31 |
| @reduxjs/toolkit | 2.11.2 | MIT | runtime transitive | no (local compute/render/build only) | no | https://github.com/reduxjs/redux-toolkit | 2026-10-12 | rule 31 |
| @standard-schema/spec | 1.1.0 | MIT | runtime transitive | no (local compute/render/build only) | no | https://github.com/standard-schema/standard-schema | 2026-10-12 | rule 31 |
| @standard-schema/utils | 0.3.0 | MIT | runtime transitive | no (local compute/render/build only) | no | https://github.com/standard-schema/standard-schema | 2026-10-12 | rule 31 |
| @supabase/auth-js | 2.117.2 | MIT | runtime transitive | yes (first-party Supabase project via env; no third-party data vendor) | no | https://github.com/supabase/supabase-js | 2026-10-12 | rule 31 |
| @supabase/functions-js | 2.117.2 | MIT | runtime transitive | yes (first-party Supabase project via env; no third-party data vendor) | no | https://github.com/supabase/supabase-js | 2026-10-12 | rule 31 |
| @supabase/phoenix | 0.4.5 | MIT | runtime transitive | yes (first-party Supabase project via env; no third-party data vendor) | no | https://github.com/supabase/phoenix | 2026-10-12 | rule 31 |
| @supabase/postgrest-js | 2.117.2 | MIT | runtime transitive | yes (first-party Supabase project via env; no third-party data vendor) | no | https://github.com/supabase/supabase-js | 2026-10-12 | rule 31 |
| @supabase/realtime-js | 2.117.2 | MIT | runtime transitive | yes (first-party Supabase project via env; no third-party data vendor) | no | https://github.com/supabase/supabase-js | 2026-10-12 | rule 31 |
| @supabase/ssr | 0.12.7 | MIT | runtime direct | yes (first-party Supabase project via env; no third-party data vendor) | no | https://github.com/supabase/ssr | 2026-10-12 | rule 31 |
| @supabase/storage-js | 2.117.2 | MIT | runtime transitive | yes (first-party Supabase project via env; no third-party data vendor) | no | https://github.com/supabase/supabase-js | 2026-10-12 | rule 31 |
| @supabase/supabase-js | 2.117.2 | MIT | runtime direct | yes (first-party Supabase project via env; no third-party data vendor) | no | https://github.com/supabase/supabase-js | 2026-10-12 | rule 31 |
| @swc/helpers | 0.5.15 | Apache-2.0 | runtime transitive | no (local compute/render/build only) | no | https://github.com/swc-project/swc | 2026-10-12 | rule 31 |
| @types/d3-array | 3.2.2 | MIT | runtime transitive | no (local compute/render/build only) | no | https://github.com/DefinitelyTyped/DefinitelyTyped | 2026-10-12 | rule 31 |
| @types/d3-color | 3.1.3 | MIT | runtime transitive | no (local compute/render/build only) | no | https://github.com/DefinitelyTyped/DefinitelyTyped | 2026-10-12 | rule 31 |
| @types/d3-ease | 3.0.2 | MIT | runtime transitive | no (local compute/render/build only) | no | https://github.com/DefinitelyTyped/DefinitelyTyped | 2026-10-12 | rule 31 |
| @types/d3-interpolate | 3.0.4 | MIT | runtime transitive | no (local compute/render/build only) | no | https://github.com/DefinitelyTyped/DefinitelyTyped | 2026-10-12 | rule 31 |
| @types/d3-path | 3.1.1 | MIT | runtime transitive | no (local compute/render/build only) | no | https://github.com/DefinitelyTyped/DefinitelyTyped | 2026-10-12 | rule 31 |
| @types/d3-scale | 4.0.9 | MIT | runtime transitive | no (local compute/render/build only) | no | https://github.com/DefinitelyTyped/DefinitelyTyped | 2026-10-12 | rule 31 |
| @types/d3-shape | 3.1.8 | MIT | runtime transitive | no (local compute/render/build only) | no | https://github.com/DefinitelyTyped/DefinitelyTyped | 2026-10-12 | rule 31 |
| @types/d3-time | 3.0.4 | MIT | runtime transitive | no (local compute/render/build only) | no | https://github.com/DefinitelyTyped/DefinitelyTyped | 2026-10-12 | rule 31 |
| @types/d3-timer | 3.0.2 | MIT | runtime transitive | no (local compute/render/build only) | no | https://github.com/DefinitelyTyped/DefinitelyTyped | 2026-10-12 | rule 31 |
| @types/react | 19.2.14 | MIT | runtime transitive | no (local compute/render/build only) | no | https://github.com/DefinitelyTyped/DefinitelyTyped | 2026-10-12 | rule 31 |
| @types/use-sync-external-store | 0.0.6 | MIT | runtime transitive | no (local compute/render/build only) | no | https://github.com/DefinitelyTyped/DefinitelyTyped | 2026-10-12 | rule 31 |
| acorn-walk | 8.3.5 | MIT | runtime transitive | no (local compute/render/build only) | no | https://github.com/acornjs/acorn | 2026-10-12 | rule 31 |
| acorn | 8.16.0 | MIT | runtime transitive | no (local compute/render/build only) | no | https://github.com/acornjs/acorn | 2026-10-12 | rule 31 |
| baseline-browser-mapping | 2.10.29 | Apache-2.0 | runtime transitive | no (local compute/render/build only) | no | https://github.com/web-platform-dx/baseline-browser-mapping | 2026-10-12 | rule 31 |
| caniuse-lite | 1.0.30001792 | CC-BY-4.0 | runtime transitive | no (local compute/render/build only) | yes (BY attribution retained) | https://github.com/browserslist/caniuse-lite | 2026-10-12 | rule 31 |
| client-only | 0.0.1 | MIT | runtime transitive | no (local compute/render/build only) | no | https://www.npmjs.com/package/client-only | 2026-10-12 | rule 31 |
| clsx | 2.1.1 | MIT | runtime transitive | no (local compute/render/build only) | no | https://github.com/lukeed/clsx | 2026-10-12 | rule 31 |
| commander | 7.2.0 | MIT | runtime transitive | no (local compute/render/build only) | no | https://github.com/tj/commander.js | 2026-10-12 | rule 31 |
| cookie | 1.1.1 | MIT | runtime transitive | no (local compute/render/build only) | no | https://github.com/jshttp/cookie | 2026-10-12 | rule 31 |
| csstype | 3.2.3 | MIT | runtime transitive | no (local compute/render/build only) | no | https://github.com/frenic/csstype | 2026-10-12 | rule 31 |
| d3-array | 3.2.4 | ISC | runtime transitive | no (local compute/render/build only) | no | https://github.com/d3/d3-array | 2026-10-12 | rule 31 |
| d3-color | 3.1.0 | ISC | runtime transitive | no (local compute/render/build only) | no | https://github.com/d3/d3-color | 2026-10-12 | rule 31 |
| d3-ease | 3.0.1 | BSD-3-Clause | runtime transitive | no (local compute/render/build only) | no | https://github.com/d3/d3-ease | 2026-10-12 | rule 31 |
| d3-format | 3.1.2 | ISC | runtime transitive | no (local compute/render/build only) | no | https://github.com/d3/d3-format | 2026-10-12 | rule 31 |
| d3-interpolate | 3.0.1 | ISC | runtime transitive | no (local compute/render/build only) | no | https://github.com/d3/d3-interpolate | 2026-10-12 | rule 31 |
| d3-path | 3.1.0 | ISC | runtime transitive | no (local compute/render/build only) | no | https://github.com/d3/d3-path | 2026-10-12 | rule 31 |
| d3-scale | 4.0.2 | ISC | runtime transitive | no (local compute/render/build only) | no | https://github.com/d3/d3-scale | 2026-10-12 | rule 31 |
| d3-shape | 3.2.0 | ISC | runtime transitive | no (local compute/render/build only) | no | https://github.com/d3/d3-shape | 2026-10-12 | rule 31 |
| d3-time-format | 4.1.0 | ISC | runtime transitive | no (local compute/render/build only) | no | https://github.com/d3/d3-time-format | 2026-10-12 | rule 31 |
| d3-time | 3.1.0 | ISC | runtime transitive | no (local compute/render/build only) | no | https://github.com/d3/d3-time | 2026-10-12 | rule 31 |
| d3-timer | 3.0.1 | ISC | runtime transitive | no (local compute/render/build only) | no | https://github.com/d3/d3-timer | 2026-10-12 | rule 31 |
| debounce | 1.2.1 | MIT | runtime transitive | no (local compute/render/build only) | no | https://github.com/component/debounce | 2026-10-12 | rule 31 |
| decimal.js-light | 2.5.1 | MIT | runtime transitive | no (local compute/render/build only) | no | https://github.com/MikeMcl/decimal.js-light | 2026-10-12 | rule 31 |
| detect-libc | 2.1.2 | Apache-2.0 | runtime transitive | no (local compute/render/build only) | no | https://github.com/lovell/detect-libc | 2026-10-12 | rule 31 |
| duplexer | 0.1.2 | MIT | runtime transitive | no (local compute/render/build only) | no | https://github.com/Raynos/duplexer | 2026-10-12 | rule 31 |
| es-toolkit | 1.46.1 | MIT | runtime transitive | no (local compute/render/build only) | no | https://github.com/toss/es-toolkit | 2026-10-12 | rule 31 |
| escape-string-regexp | 4.0.0 | MIT | runtime transitive | no (local compute/render/build only) | no | https://github.com/sindresorhus/escape-string-regexp | 2026-10-12 | rule 31 |
| eventemitter3 | 5.0.4 | MIT | runtime transitive | no (local compute/render/build only) | no | https://github.com/primus/eventemitter3 | 2026-10-12 | rule 31 |
| gzip-size | 6.0.0 | MIT | runtime transitive | no (local compute/render/build only) | no | https://github.com/sindresorhus/gzip-size | 2026-10-12 | rule 31 |
| html-escaper | 2.0.2 | MIT | runtime transitive | no (local compute/render/build only) | no | https://github.com/WebReflection/html-escaper | 2026-10-12 | rule 31 |
| iceberg-js | 0.8.1 | MIT | runtime transitive | no (local compute/render/build only) | no | https://github.com/supabase/iceberg-js | 2026-10-12 | rule 31 |
| immer | 10.2.0 | MIT | runtime transitive | no (local compute/render/build only) | no | https://github.com/immerjs/immer | 2026-10-12 | rule 31 |
| immer | 11.1.8 | MIT | runtime transitive | no (local compute/render/build only) | no | https://github.com/immerjs/immer | 2026-10-12 | rule 31 |
| internmap | 2.0.3 | ISC | runtime transitive | no (local compute/render/build only) | no | https://github.com/mbostock/internmap | 2026-10-12 | rule 31 |
| is-plain-object | 5.1.0 | MIT | runtime transitive | no (local compute/render/build only) | no | https://github.com/jonschlinkert/is-plain-object | 2026-10-12 | rule 31 |
| mrmime | 2.0.1 | MIT | runtime transitive | no (local compute/render/build only) | no | https://github.com/lukeed/mrmime | 2026-10-12 | rule 31 |
| nanoid | 3.3.19 | MIT | runtime transitive | no (local compute/render/build only) | no | https://github.com/ai/nanoid | 2026-10-12 | rule 31 |
| next | 16.2.4 | MIT | runtime direct | no (local compute/render/build only) | no | https://github.com/vercel/next.js | 2026-10-12 | rule 31 |
| opener | 1.5.2 | (WTFPL OR MIT) | runtime transitive | no (local compute/render/build only) | no | https://github.com/domenic/opener | 2026-10-12 | rule 31 |
| picocolors | 1.1.1 | ISC | runtime transitive | no (local compute/render/build only) | no | https://github.com/alexeyraspopov/picocolors | 2026-10-12 | rule 31 |
| playwright-core | 1.63.0 | Apache-2.0 | runtime transitive | no (local compute/render/build only) | no | https://github.com/microsoft/playwright | 2026-10-12 | rule 31 |
| playwright | 1.63.0 | Apache-2.0 | runtime transitive | no (local compute/render/build only) | no | https://github.com/microsoft/playwright | 2026-10-12 | rule 31 |
| postcss | 8.4.31 | MIT | runtime transitive | no (local compute/render/build only) | no | https://github.com/postcss/postcss | 2026-10-12 | rule 31 |
| react-dom | 19.2.4 | MIT | runtime direct | no (local compute/render/build only) | no | https://github.com/facebook/react | 2026-10-12 | rule 31 |
| react-is | 19.2.6 | MIT | runtime transitive | no (local compute/render/build only) | no | https://github.com/facebook/react | 2026-10-12 | rule 31 |
| react-redux | 9.2.0 | MIT | runtime transitive | no (local compute/render/build only) | no | https://github.com/reduxjs/react-redux | 2026-10-12 | rule 31 |
| react | 19.2.4 | MIT | runtime direct | no (local compute/render/build only) | no | https://github.com/facebook/react | 2026-10-12 | rule 31 |
| recharts | 3.8.1 | MIT | runtime direct | no (local compute/render/build only) | no | https://github.com/recharts/recharts | 2026-10-12 | rule 31 |
| redux-thunk | 3.1.0 | MIT | runtime transitive | no (local compute/render/build only) | no | https://github.com/reduxjs/redux-thunk | 2026-10-12 | rule 31 |
| redux | 5.0.1 | MIT | runtime transitive | no (local compute/render/build only) | no | https://github.com/reduxjs/redux | 2026-10-12 | rule 31 |
| reselect | 5.1.1 | MIT | runtime transitive | no (local compute/render/build only) | no | https://github.com/reduxjs/reselect | 2026-10-12 | rule 31 |
| scheduler | 0.27.0 | MIT | runtime transitive | no (local compute/render/build only) | no | https://github.com/facebook/react | 2026-10-12 | rule 31 |
| semver | 7.8.0 | ISC | runtime transitive | no (local compute/render/build only) | no | https://github.com/npm/node-semver | 2026-10-12 | rule 31 |
| server-only | 0.0.1 | MIT | runtime direct | no (local compute/render/build only) | no | https://www.npmjs.com/package/server-only | 2026-10-12 | rule 31 |
| sharp | 0.34.5 | Apache-2.0 | runtime transitive | no (local compute/render/build only) | no | https://github.com/lovell/sharp | 2026-10-12 | rule 31 |
| sirv | 2.0.4 | MIT | runtime transitive | no (local compute/render/build only) | no | https://github.com/lukeed/sirv | 2026-10-12 | rule 31 |
| source-map-js | 1.2.1 | BSD-3-Clause | runtime transitive | no (local compute/render/build only) | no | https://github.com/7rulnik/source-map-js | 2026-10-12 | rule 31 |
| styled-jsx | 5.1.6 | MIT | runtime transitive | no (local compute/render/build only) | no | https://github.com/vercel/styled-jsx | 2026-10-12 | rule 31 |
| tiny-invariant | 1.3.3 | MIT | runtime transitive | no (local compute/render/build only) | no | https://github.com/alexreardon/tiny-invariant | 2026-10-12 | rule 31 |
| totalist | 3.0.1 | MIT | runtime transitive | no (local compute/render/build only) | no | https://github.com/lukeed/totalist | 2026-10-12 | rule 31 |
| tslib | 2.8.1 | 0BSD | runtime transitive | no (local compute/render/build only) | no | https://github.com/Microsoft/tslib | 2026-10-12 | rule 31 |
| use-sync-external-store | 1.6.0 | MIT | runtime transitive | no (local compute/render/build only) | no | https://github.com/facebook/react | 2026-10-12 | rule 31 |
| victory-vendor | 37.3.6 | MIT AND ISC | runtime transitive | no (local compute/render/build only) | no | https://github.com/FormidableLabs/victory | 2026-10-12 | rule 31 |
| webpack-bundle-analyzer | 4.10.1 | MIT | runtime transitive | no (local compute/render/build only) | no | https://github.com/webpack-contrib/webpack-bundle-analyzer | 2026-10-12 | rule 31 |
| ws | 7.5.13 | MIT | runtime transitive | no (local compute/render/build only) | no | https://github.com/websockets/ws | 2026-10-12 | rule 31 |
| zod | 4.6.5 | MIT | runtime direct | no (local compute/render/build only) | no | https://github.com/colinhacks/zod | 2026-10-12 | rule 31 |
| @axe-core/playwright | 4.13.0 | MPL-2.0 | dev direct | no (local compute/render/build only) | no | https://github.com/dequelabs/axe-core-npm | 2026-10-12 | rule 31 |
| @babel/code-frame | 7.29.0 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/babel/babel | 2026-10-12 | rule 31 |
| @babel/compat-data | 7.29.3 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/babel/babel | 2026-10-12 | rule 31 |
| @babel/core | 7.29.0 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/babel/babel | 2026-10-12 | rule 31 |
| @babel/generator | 7.29.1 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/babel/babel | 2026-10-12 | rule 31 |
| @babel/helper-compilation-targets | 7.28.6 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/babel/babel | 2026-10-12 | rule 31 |
| @babel/helper-globals | 7.28.0 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/babel/babel | 2026-10-12 | rule 31 |
| @babel/helper-module-imports | 7.28.6 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/babel/babel | 2026-10-12 | rule 31 |
| @babel/helper-module-transforms | 7.28.6 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/babel/babel | 2026-10-12 | rule 31 |
| @babel/helper-string-parser | 7.27.1 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/babel/babel | 2026-10-12 | rule 31 |
| @babel/helper-validator-identifier | 7.28.5 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/babel/babel | 2026-10-12 | rule 31 |
| @babel/helper-validator-option | 7.27.1 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/babel/babel | 2026-10-12 | rule 31 |
| @babel/helpers | 7.29.2 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/babel/babel | 2026-10-12 | rule 31 |
| @babel/parser | 7.29.3 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/babel/babel | 2026-10-12 | rule 31 |
| @babel/template | 7.28.6 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/babel/babel | 2026-10-12 | rule 31 |
| @babel/traverse | 7.29.0 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/babel/babel | 2026-10-12 | rule 31 |
| @babel/types | 7.29.0 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/babel/babel | 2026-10-12 | rule 31 |
| @emnapi/runtime | 1.10.0 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/toyobayashi/emnapi | 2026-10-12 | rule 31 |
| @esbuild/win32-x64 | 0.28.0 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/evanw/esbuild | 2026-10-12 | rule 31 |
| @eslint-community/eslint-utils | 4.9.1 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/eslint-community/eslint-utils | 2026-10-12 | rule 31 |
| @eslint-community/regexpp | 4.12.2 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/eslint-community/regexpp | 2026-10-12 | rule 31 |
| @eslint/config-array | 0.21.2 | Apache-2.0 | dev transitive | no (local compute/render/build only) | no | https://github.com/eslint/rewrite | 2026-10-12 | rule 31 |
| @eslint/config-helpers | 0.4.2 | Apache-2.0 | dev transitive | no (local compute/render/build only) | no | https://github.com/eslint/rewrite | 2026-10-12 | rule 31 |
| @eslint/core | 0.17.0 | Apache-2.0 | dev transitive | no (local compute/render/build only) | no | https://github.com/eslint/rewrite | 2026-10-12 | rule 31 |
| @eslint/eslintrc | 3.3.5 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/eslint/eslintrc | 2026-10-12 | rule 31 |
| @eslint/js | 9.39.4 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/eslint/eslint | 2026-10-12 | rule 31 |
| @eslint/object-schema | 2.1.7 | Apache-2.0 | dev transitive | no (local compute/render/build only) | no | https://github.com/eslint/rewrite | 2026-10-12 | rule 31 |
| @eslint/plugin-kit | 0.4.1 | Apache-2.0 | dev transitive | no (local compute/render/build only) | no | https://github.com/eslint/rewrite | 2026-10-12 | rule 31 |
| @formatjs/ecma402-abstract | 2.3.6 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/formatjs/formatjs | 2026-10-12 | rule 31 |
| @formatjs/fast-memoize | 2.2.7 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/formatjs/formatjs | 2026-10-12 | rule 31 |
| @formatjs/icu-messageformat-parser | 2.11.4 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/formatjs/formatjs | 2026-10-12 | rule 31 |
| @formatjs/icu-skeleton-parser | 1.8.16 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/formatjs/formatjs | 2026-10-12 | rule 31 |
| @formatjs/intl-localematcher | 0.6.2 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/formatjs/formatjs | 2026-10-12 | rule 31 |
| @humanfs/core | 0.19.2 | Apache-2.0 | dev transitive | no (local compute/render/build only) | no | https://github.com/humanwhocodes/humanfs | 2026-10-12 | rule 31 |
| @humanfs/node | 0.16.8 | Apache-2.0 | dev transitive | no (local compute/render/build only) | no | https://github.com/humanwhocodes/humanfs | 2026-10-12 | rule 31 |
| @humanfs/types | 0.15.0 | Apache-2.0 | dev transitive | no (local compute/render/build only) | no | https://github.com/humanwhocodes/humanfs | 2026-10-12 | rule 31 |
| @humanwhocodes/module-importer | 1.0.1 | Apache-2.0 | dev transitive | no (local compute/render/build only) | no | https://github.com/humanwhocodes/module-importer | 2026-10-12 | rule 31 |
| @humanwhocodes/retry | 0.4.3 | Apache-2.0 | dev transitive | no (local compute/render/build only) | no | https://github.com/humanwhocodes/retry | 2026-10-12 | rule 31 |
| @jridgewell/gen-mapping | 0.3.13 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/jridgewell/sourcemaps | 2026-10-12 | rule 31 |
| @jridgewell/remapping | 2.3.5 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/jridgewell/sourcemaps | 2026-10-12 | rule 31 |
| @jridgewell/resolve-uri | 3.1.2 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/jridgewell/resolve-uri | 2026-10-12 | rule 31 |
| @jridgewell/sourcemap-codec | 1.6.0 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/jridgewell/sourcemaps | 2026-10-12 | rule 31 |
| @jridgewell/trace-mapping | 0.3.31 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/jridgewell/sourcemaps | 2026-10-12 | rule 31 |
| @next/eslint-plugin-next | 16.2.4 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/vercel/next.js | 2026-10-12 | rule 31 |
| @nodelib/fs.scandir | 2.1.5 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/nodelib/nodelib/tree/master/packages/fs/fs.scandir | 2026-10-12 | rule 31 |
| @nodelib/fs.stat | 2.0.5 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/nodelib/nodelib/tree/master/packages/fs/fs.stat | 2026-10-12 | rule 31 |
| @nodelib/fs.walk | 1.2.8 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/nodelib/nodelib/tree/master/packages/fs/fs.walk | 2026-10-12 | rule 31 |
| @nolyfill/is-core-module | 1.0.39 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/SukkaW/nolyfill | 2026-10-12 | rule 31 |
| @opentelemetry/api-logs | 0.220.0 | Apache-2.0 | dev transitive | no (local compute/render/build only) | no | https://github.com/open-telemetry/opentelemetry-js | 2026-10-12 | rule 31 |
| @opentelemetry/core | 2.11.0 | Apache-2.0 | dev transitive | no (local compute/render/build only) | no | https://github.com/open-telemetry/opentelemetry-js | 2026-10-12 | rule 31 |
| @opentelemetry/instrumentation | 0.220.0 | Apache-2.0 | dev transitive | no (local compute/render/build only) | no | https://github.com/open-telemetry/opentelemetry-js | 2026-10-12 | rule 31 |
| @opentelemetry/resources | 2.11.0 | Apache-2.0 | dev transitive | no (local compute/render/build only) | no | https://github.com/open-telemetry/opentelemetry-js | 2026-10-12 | rule 31 |
| @opentelemetry/sdk-trace-base | 2.11.0 | Apache-2.0 | dev transitive | no (local compute/render/build only) | no | https://github.com/open-telemetry/opentelemetry-js | 2026-10-12 | rule 31 |
| @opentelemetry/sdk-trace | 2.11.0 | Apache-2.0 | dev transitive | no (local compute/render/build only) | no | https://github.com/open-telemetry/opentelemetry-js | 2026-10-12 | rule 31 |
| @opentelemetry/semantic-conventions | 1.43.0 | Apache-2.0 | dev transitive | no (local compute/render/build only) | no | https://github.com/open-telemetry/opentelemetry-js | 2026-10-12 | rule 31 |
| @oxc-project/types | 0.151.0 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/oxc-project/oxc | 2026-10-12 | rule 31 |
| @paulirish/trace_engine | 0.0.65 | BSD-3-Clause | dev transitive | no (local compute/render/build only) | no | https://www.npmjs.com/package/@paulirish/trace_engine | 2026-10-12 | rule 31 |
| @puppeteer/browsers | 3.2.3 | Apache-2.0 | dev transitive | no (local compute/render/build only) | no | https://github.com/puppeteer/puppeteer/tree/main/packages/browsers | 2026-10-12 | rule 31 |
| @rolldown/binding-win32-x64-msvc | 1.2.11 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/rolldown/rolldown | 2026-10-12 | rule 31 |
| @rolldown/pluginutils | 1.0.1 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/rolldown/plugins | 2026-10-12 | rule 31 |
| @rtsao/scc | 1.1.0 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/rtsao/scc | 2026-10-12 | rule 31 |
| @sentry/conventions | 0.16.0 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/getsentry/sentry-conventions | 2026-10-12 | rule 31 |
| @sentry/core | 10.75.3 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/getsentry/sentry-javascript | 2026-10-12 | rule 31 |
| @sentry/node-core | 10.75.3 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/getsentry/sentry-javascript | 2026-10-12 | rule 31 |
| @sentry/node | 10.75.3 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/getsentry/sentry-javascript | 2026-10-12 | rule 31 |
| @sentry/opentelemetry | 10.75.3 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/getsentry/sentry-javascript | 2026-10-12 | rule 31 |
| @sentry/server-utils | 10.75.3 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/getsentry/sentry-javascript | 2026-10-12 | rule 31 |
| @types/chai | 5.2.3 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/DefinitelyTyped/DefinitelyTyped | 2026-10-12 | rule 31 |
| @types/deep-eql | 4.0.2 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/DefinitelyTyped/DefinitelyTyped | 2026-10-12 | rule 31 |
| @types/estree | 1.0.9 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/DefinitelyTyped/DefinitelyTyped | 2026-10-12 | rule 31 |
| @types/json-schema | 7.0.15 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/DefinitelyTyped/DefinitelyTyped | 2026-10-12 | rule 31 |
| @types/json5 | 0.0.29 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/DefinitelyTyped/DefinitelyTyped | 2026-10-12 | rule 31 |
| @types/node | 22.20.4 | MIT | dev direct | no (local compute/render/build only) | no | https://github.com/DefinitelyTyped/DefinitelyTyped | 2026-10-12 | rule 31 |
| @types/react-dom | 19.2.3 | MIT | dev direct | no (local compute/render/build only) | no | https://github.com/DefinitelyTyped/DefinitelyTyped | 2026-10-12 | rule 31 |
| @typescript-eslint/eslint-plugin | 8.59.2 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/typescript-eslint/typescript-eslint | 2026-10-12 | rule 31 |
| @typescript-eslint/parser | 8.59.2 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/typescript-eslint/typescript-eslint | 2026-10-12 | rule 31 |
| @typescript-eslint/project-service | 8.59.2 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/typescript-eslint/typescript-eslint | 2026-10-12 | rule 31 |
| @typescript-eslint/scope-manager | 8.59.2 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/typescript-eslint/typescript-eslint | 2026-10-12 | rule 31 |
| @typescript-eslint/tsconfig-utils | 8.59.2 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/typescript-eslint/typescript-eslint | 2026-10-12 | rule 31 |
| @typescript-eslint/type-utils | 8.59.2 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/typescript-eslint/typescript-eslint | 2026-10-12 | rule 31 |
| @typescript-eslint/types | 8.59.2 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/typescript-eslint/typescript-eslint | 2026-10-12 | rule 31 |
| @typescript-eslint/typescript-estree | 8.59.2 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/typescript-eslint/typescript-eslint | 2026-10-12 | rule 31 |
| @typescript-eslint/utils | 8.59.2 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/typescript-eslint/typescript-eslint | 2026-10-12 | rule 31 |
| @typescript-eslint/visitor-keys | 8.59.2 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/typescript-eslint/typescript-eslint | 2026-10-12 | rule 31 |
| @unrs/resolver-binding-win32-x64-msvc | 1.11.1 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/unrs/unrs-resolver | 2026-10-12 | rule 31 |
| @vitest/mocker | 5.0.2 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/vitest-dev/vitest | 2026-10-12 | rule 31 |
| @vitest/spy | 5.0.2 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/vitest-dev/vitest | 2026-10-12 | rule 31 |
| acorn-jsx | 5.3.2 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/acornjs/acorn-jsx | 2026-10-12 | rule 31 |
| ajv-formats | 3.0.1 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/ajv-validator/ajv-formats | 2026-10-12 | rule 31 |
| ajv | 6.15.0 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/ajv-validator/ajv | 2026-10-12 | rule 31 |
| ajv | 8.20.0 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/ajv-validator/ajv | 2026-10-12 | rule 31 |
| ansi-colors | 4.1.3 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/doowb/ansi-colors | 2026-10-12 | rule 31 |
| ansi-regex | 5.0.1 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/chalk/ansi-regex | 2026-10-12 | rule 31 |
| ansi-regex | 6.4.0 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/chalk/ansi-regex | 2026-10-12 | rule 31 |
| ansi-styles | 4.3.0 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/chalk/ansi-styles | 2026-10-12 | rule 31 |
| ansi-styles | 6.2.3 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/chalk/ansi-styles | 2026-10-12 | rule 31 |
| argparse | 2.0.1 | Python-2.0 | dev transitive | no (local compute/render/build only) | no | https://github.com/nodeca/argparse | 2026-10-12 | rule 31 |
| aria-query | 5.3.2 | Apache-2.0 | dev transitive | no (local compute/render/build only) | no | https://github.com/A11yance/aria-query | 2026-10-12 | rule 31 |
| array-buffer-byte-length | 1.0.2 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/inspect-js/array-buffer-byte-length | 2026-10-12 | rule 31 |
| array-includes | 3.1.9 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/es-shims/array-includes | 2026-10-12 | rule 31 |
| array.prototype.findlast | 1.2.5 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/es-shims/Array.prototype.findLast | 2026-10-12 | rule 31 |
| array.prototype.findlastindex | 1.2.6 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/es-shims/Array.prototype.findLastIndex | 2026-10-12 | rule 31 |
| array.prototype.flat | 1.3.3 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/es-shims/Array.prototype.flat | 2026-10-12 | rule 31 |
| array.prototype.flatmap | 1.3.3 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/es-shims/Array.prototype.flatMap | 2026-10-12 | rule 31 |
| array.prototype.tosorted | 1.1.4 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/es-shims/Array.prototype.toSorted | 2026-10-12 | rule 31 |
| arraybuffer.prototype.slice | 1.0.4 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/es-shims/ArrayBuffer.prototype.slice | 2026-10-12 | rule 31 |
| assertion-error | 2.0.1 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/chaijs/assertion-error | 2026-10-12 | rule 31 |
| ast-types-flow | 0.0.8 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/kyldvs/ast-types-flow | 2026-10-12 | rule 31 |
| async-function | 1.0.0 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/ljharb/async-function | 2026-10-12 | rule 31 |
| atomically | 2.1.1 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/fabiospampinato/atomically | 2026-10-12 | rule 31 |
| available-typed-arrays | 1.0.7 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/inspect-js/available-typed-arrays | 2026-10-12 | rule 31 |
| axe-core | 4.13.0 | MPL-2.0 | dev transitive | no (local compute/render/build only) | no | https://github.com/dequelabs/axe-core | 2026-10-12 | rule 31 |
| axobject-query | 4.1.0 | Apache-2.0 | dev transitive | no (local compute/render/build only) | no | https://github.com/A11yance/axobject-query | 2026-10-12 | rule 31 |
| balanced-match | 1.0.2 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/juliangruber/balanced-match | 2026-10-12 | rule 31 |
| balanced-match | 4.0.4 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/juliangruber/balanced-match | 2026-10-12 | rule 31 |
| brace-expansion | 1.1.14 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/juliangruber/brace-expansion | 2026-10-12 | rule 31 |
| brace-expansion | 5.0.6 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/juliangruber/brace-expansion | 2026-10-12 | rule 31 |
| braces | 3.0.3 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/micromatch/braces | 2026-10-12 | rule 31 |
| browserslist | 4.28.2 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/browserslist/browserslist | 2026-10-12 | rule 31 |
| call-bind-apply-helpers | 1.0.2 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/ljharb/call-bind-apply-helpers | 2026-10-12 | rule 31 |
| call-bind | 1.0.9 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/ljharb/call-bind | 2026-10-12 | rule 31 |
| call-bound | 1.0.4 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/ljharb/call-bound | 2026-10-12 | rule 31 |
| callsites | 3.1.0 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/sindresorhus/callsites | 2026-10-12 | rule 31 |
| chai | 6.2.2 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/chaijs/chai | 2026-10-12 | rule 31 |
| chalk | 4.1.2 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/chalk/chalk | 2026-10-12 | rule 31 |
| chrome-launcher | 1.2.2 | Apache-2.0 | dev transitive | no (local compute/render/build only) | no | https://github.com/GoogleChrome/chrome-launcher | 2026-10-12 | rule 31 |
| chromium-bidi | 17.0.2 | Apache-2.0 | dev transitive | no (local compute/render/build only) | no | https://github.com/GoogleChromeLabs/chromium-bidi | 2026-10-12 | rule 31 |
| cjs-module-lexer | 2.2.1 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/nodejs/cjs-module-lexer | 2026-10-12 | rule 31 |
| cliui | 8.0.1 | ISC | dev transitive | no (local compute/render/build only) | no | https://github.com/yargs/cliui | 2026-10-12 | rule 31 |
| cliui | 9.0.1 | ISC | dev transitive | no (local compute/render/build only) | no | https://github.com/yargs/cliui | 2026-10-12 | rule 31 |
| color-convert | 2.0.1 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/Qix-/color-convert | 2026-10-12 | rule 31 |
| color-name | 1.1.4 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/colorjs/color-name | 2026-10-12 | rule 31 |
| concat-map | 0.0.1 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/substack/node-concat-map | 2026-10-12 | rule 31 |
| configstore | 7.1.0 | BSD-2-Clause | dev transitive | no (local compute/render/build only) | no | https://github.com/sindresorhus/configstore | 2026-10-12 | rule 31 |
| convert-source-map | 2.0.0 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/thlorenz/convert-source-map | 2026-10-12 | rule 31 |
| cross-spawn | 7.0.6 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/moxystudio/node-cross-spawn | 2026-10-12 | rule 31 |
| csp_evaluator | 1.1.8 | Apache-2.0 | dev transitive | no (local compute/render/build only) | no | https://github.com/google/csp-evaluator | 2026-10-12 | rule 31 |
| damerau-levenshtein | 1.0.8 | BSD-2-Clause | dev transitive | no (local compute/render/build only) | no | https://github.com/tad-lispy/node-damerau-levenshtein | 2026-10-12 | rule 31 |
| data-view-buffer | 1.0.2 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/inspect-js/data-view-buffer | 2026-10-12 | rule 31 |
| data-view-byte-length | 1.0.2 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/inspect-js/data-view-byte-length | 2026-10-12 | rule 31 |
| data-view-byte-offset | 1.0.1 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/inspect-js/data-view-byte-offset | 2026-10-12 | rule 31 |
| debug | 3.2.7 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/visionmedia/debug | 2026-10-12 | rule 31 |
| debug | 4.4.3 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/debug-js/debug | 2026-10-12 | rule 31 |
| decimal.js | 10.6.0 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/MikeMcl/decimal.js | 2026-10-12 | rule 31 |
| deep-is | 0.1.4 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/thlorenz/deep-is | 2026-10-12 | rule 31 |
| define-data-property | 1.1.4 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/ljharb/define-data-property | 2026-10-12 | rule 31 |
| define-lazy-prop | 2.0.0 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/sindresorhus/define-lazy-prop | 2026-10-12 | rule 31 |
| define-properties | 1.2.1 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/ljharb/define-properties | 2026-10-12 | rule 31 |
| devtools-protocol | 0.0.1687809 | BSD-3-Clause | dev transitive | no (local compute/render/build only) | no | https://github.com/ChromeDevTools/devtools-protocol | 2026-10-12 | rule 31 |
| doctrine | 2.1.0 | Apache-2.0 | dev transitive | no (local compute/render/build only) | no | https://github.com/eslint/doctrine | 2026-10-12 | rule 31 |
| dot-prop | 9.0.0 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/sindresorhus/dot-prop | 2026-10-12 | rule 31 |
| dunder-proto | 1.0.1 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/es-shims/dunder-proto | 2026-10-12 | rule 31 |
| electron-to-chromium | 1.5.353 | ISC | dev transitive | no (local compute/render/build only) | no | https://github.com/Kilian/electron-to-chromium | 2026-10-12 | rule 31 |
| emoji-regex | 10.6.0 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/mathiasbynens/emoji-regex | 2026-10-12 | rule 31 |
| emoji-regex | 8.0.0 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/mathiasbynens/emoji-regex | 2026-10-12 | rule 31 |
| emoji-regex | 9.2.2 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/mathiasbynens/emoji-regex | 2026-10-12 | rule 31 |
| enquirer | 2.4.1 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/enquirer/enquirer | 2026-10-12 | rule 31 |
| es-abstract | 1.24.2 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/ljharb/es-abstract | 2026-10-12 | rule 31 |
| es-define-property | 1.0.1 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/ljharb/es-define-property | 2026-10-12 | rule 31 |
| es-errors | 1.3.0 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/ljharb/es-errors | 2026-10-12 | rule 31 |
| es-iterator-helpers | 1.3.2 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/es-shims/iterator-helpers | 2026-10-12 | rule 31 |
| es-module-lexer | 2.3.2 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/guybedford/es-module-lexer | 2026-10-12 | rule 31 |
| es-module-lexer | 3.0.2 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/guybedford/es-module-lexer | 2026-10-12 | rule 31 |
| es-object-atoms | 1.1.1 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/ljharb/es-object-atoms | 2026-10-12 | rule 31 |
| es-set-tostringtag | 2.1.0 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/es-shims/es-set-tostringtag | 2026-10-12 | rule 31 |
| es-shim-unscopables | 1.1.0 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/ljharb/es-shim-unscopables | 2026-10-12 | rule 31 |
| es-to-primitive | 1.3.0 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/ljharb/es-to-primitive | 2026-10-12 | rule 31 |
| esbuild | 0.28.0 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/evanw/esbuild | 2026-10-12 | rule 31 |
| escalade | 3.2.0 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/lukeed/escalade | 2026-10-12 | rule 31 |
| eslint-config-next | 16.2.4 | MIT | dev direct | no (local compute/render/build only) | no | https://github.com/vercel/next.js | 2026-10-12 | rule 31 |
| eslint-import-resolver-node | 0.3.10 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/import-js/eslint-plugin-import | 2026-10-12 | rule 31 |
| eslint-import-resolver-typescript | 3.10.1 | ISC | dev transitive | no (local compute/render/build only) | no | https://github.com/import-js/eslint-import-resolver-typescript | 2026-10-12 | rule 31 |
| eslint-module-utils | 2.12.1 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/import-js/eslint-plugin-import | 2026-10-12 | rule 31 |
| eslint-plugin-import | 2.32.0 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/import-js/eslint-plugin-import | 2026-10-12 | rule 31 |
| eslint-plugin-jsx-a11y | 6.10.2 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/jsx-eslint/eslint-plugin-jsx-a11y | 2026-10-12 | rule 31 |
| eslint-plugin-react-hooks | 7.1.1 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/facebook/react | 2026-10-12 | rule 31 |
| eslint-plugin-react | 7.37.5 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/jsx-eslint/eslint-plugin-react | 2026-10-12 | rule 31 |
| eslint-scope | 8.4.0 | BSD-2-Clause | dev transitive | no (local compute/render/build only) | no | https://github.com/eslint/js | 2026-10-12 | rule 31 |
| eslint-visitor-keys | 3.4.3 | Apache-2.0 | dev transitive | no (local compute/render/build only) | no | https://github.com/eslint/eslint-visitor-keys | 2026-10-12 | rule 31 |
| eslint-visitor-keys | 4.2.1 | Apache-2.0 | dev transitive | no (local compute/render/build only) | no | https://github.com/eslint/js | 2026-10-12 | rule 31 |
| eslint-visitor-keys | 5.0.1 | Apache-2.0 | dev transitive | no (local compute/render/build only) | no | https://github.com/eslint/js | 2026-10-12 | rule 31 |
| eslint | 9.39.4 | MIT | dev direct | no (local compute/render/build only) | no | https://github.com/eslint/eslint | 2026-10-12 | rule 31 |
| espree | 10.4.0 | BSD-2-Clause | dev transitive | no (local compute/render/build only) | no | https://github.com/eslint/js | 2026-10-12 | rule 31 |
| esquery | 1.7.0 | BSD-3-Clause | dev transitive | no (local compute/render/build only) | no | https://github.com/estools/esquery | 2026-10-12 | rule 31 |
| esrecurse | 4.3.0 | BSD-2-Clause | dev transitive | no (local compute/render/build only) | no | https://github.com/estools/esrecurse | 2026-10-12 | rule 31 |
| estraverse | 5.3.0 | BSD-2-Clause | dev transitive | no (local compute/render/build only) | no | https://github.com/estools/estraverse | 2026-10-12 | rule 31 |
| estree-walker | 3.0.3 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/Rich-Harris/estree-walker | 2026-10-12 | rule 31 |
| esutils | 2.0.3 | BSD-2-Clause | dev transitive | no (local compute/render/build only) | no | https://github.com/estools/esutils | 2026-10-12 | rule 31 |
| expect-type | 1.4.0 | Apache-2.0 | dev transitive | no (local compute/render/build only) | no | https://github.com/mmkal/expect-type | 2026-10-12 | rule 31 |
| fast-deep-equal | 3.1.3 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/epoberezkin/fast-deep-equal | 2026-10-12 | rule 31 |
| fast-glob | 3.3.1 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/mrmlnc/fast-glob | 2026-10-12 | rule 31 |
| fast-json-stable-stringify | 2.1.0 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/epoberezkin/fast-json-stable-stringify | 2026-10-12 | rule 31 |
| fast-levenshtein | 2.0.6 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/hiddentao/fast-levenshtein | 2026-10-12 | rule 31 |
| fast-uri | 3.1.8 | BSD-3-Clause | dev transitive | no (local compute/render/build only) | no | https://github.com/fastify/fast-uri | 2026-10-12 | rule 31 |
| fastq | 1.20.1 | ISC | dev transitive | no (local compute/render/build only) | no | https://github.com/mcollina/fastq | 2026-10-12 | rule 31 |
| fdir | 6.5.0 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/thecodrr/fdir | 2026-10-12 | rule 31 |
| file-entry-cache | 8.0.0 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/jaredwray/file-entry-cache | 2026-10-12 | rule 31 |
| fill-range | 7.1.1 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/jonschlinkert/fill-range | 2026-10-12 | rule 31 |
| find-up | 5.0.0 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/sindresorhus/find-up | 2026-10-12 | rule 31 |
| flat-cache | 4.0.1 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/jaredwray/flat-cache | 2026-10-12 | rule 31 |
| flatted | 3.4.2 | ISC | dev transitive | no (local compute/render/build only) | no | https://github.com/WebReflection/flatted | 2026-10-12 | rule 31 |
| for-each | 0.3.5 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/Raynos/for-each | 2026-10-12 | rule 31 |
| function-bind | 1.1.2 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/Raynos/function-bind | 2026-10-12 | rule 31 |
| function.prototype.name | 1.1.8 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/es-shims/Function.prototype.name | 2026-10-12 | rule 31 |
| functions-have-names | 1.2.3 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/inspect-js/functions-have-names | 2026-10-12 | rule 31 |
| generator-function | 2.0.1 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/TimothyGu/generator-function | 2026-10-12 | rule 31 |
| gensync | 1.0.0-beta.2 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/loganfsmyth/gensync | 2026-10-12 | rule 31 |
| get-caller-file | 2.0.5 | ISC | dev transitive | no (local compute/render/build only) | no | https://github.com/stefanpenner/get-caller-file | 2026-10-12 | rule 31 |
| get-east-asian-width | 1.7.0 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/sindresorhus/get-east-asian-width | 2026-10-12 | rule 31 |
| get-intrinsic | 1.3.0 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/ljharb/get-intrinsic | 2026-10-12 | rule 31 |
| get-proto | 1.0.1 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/ljharb/get-proto | 2026-10-12 | rule 31 |
| get-symbol-description | 1.1.0 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/inspect-js/get-symbol-description | 2026-10-12 | rule 31 |
| get-tsconfig | 4.14.0 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/privatenumber/get-tsconfig | 2026-10-12 | rule 31 |
| glob-parent | 5.1.2 | ISC | dev transitive | no (local compute/render/build only) | no | https://github.com/gulpjs/glob-parent | 2026-10-12 | rule 31 |
| glob-parent | 6.0.2 | ISC | dev transitive | no (local compute/render/build only) | no | https://github.com/gulpjs/glob-parent | 2026-10-12 | rule 31 |
| globals | 14.0.0 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/sindresorhus/globals | 2026-10-12 | rule 31 |
| globals | 16.4.0 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/sindresorhus/globals | 2026-10-12 | rule 31 |
| globalthis | 1.0.4 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/ljharb/System.global | 2026-10-12 | rule 31 |
| gopd | 1.2.0 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/ljharb/gopd | 2026-10-12 | rule 31 |
| graceful-fs | 4.2.11 | ISC | dev transitive | no (local compute/render/build only) | no | https://github.com/isaacs/node-graceful-fs | 2026-10-12 | rule 31 |
| has-bigints | 1.1.0 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/ljharb/has-bigints | 2026-10-12 | rule 31 |
| has-flag | 4.0.0 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/sindresorhus/has-flag | 2026-10-12 | rule 31 |
| has-property-descriptors | 1.0.2 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/inspect-js/has-property-descriptors | 2026-10-12 | rule 31 |
| has-proto | 1.2.0 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/inspect-js/has-proto | 2026-10-12 | rule 31 |
| has-symbols | 1.1.0 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/inspect-js/has-symbols | 2026-10-12 | rule 31 |
| has-tostringtag | 1.0.2 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/inspect-js/has-tostringtag | 2026-10-12 | rule 31 |
| hasown | 2.0.3 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/inspect-js/hasOwn | 2026-10-12 | rule 31 |
| hermes-estree | 0.25.1 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/facebook/hermes | 2026-10-12 | rule 31 |
| hermes-parser | 0.25.1 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/facebook/hermes | 2026-10-12 | rule 31 |
| http-link-header | 1.1.4 | MIT | dev transitive | no (local compute/render/build only) | no | git+https://codeberg.org/jhermsmeier/node-http-link-header | 2026-10-12 | rule 31 |
| ignore | 5.3.2 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/kaelzhang/node-ignore | 2026-10-12 | rule 31 |
| ignore | 7.0.5 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/kaelzhang/node-ignore | 2026-10-12 | rule 31 |
| image-ssim | 0.2.0 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/darosh/image-ssim-js | 2026-10-12 | rule 31 |
| import-fresh | 3.3.1 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/sindresorhus/import-fresh | 2026-10-12 | rule 31 |
| import-in-the-middle | 3.5.2 | Apache-2.0 | dev transitive | no (local compute/render/build only) | no | https://github.com/nodejs/import-in-the-middle | 2026-10-12 | rule 31 |
| imurmurhash | 0.1.4 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/jensyt/imurmurhash-js | 2026-10-12 | rule 31 |
| internal-slot | 1.1.0 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/ljharb/internal-slot | 2026-10-12 | rule 31 |
| intl-messageformat | 10.7.18 | BSD-3-Clause | dev transitive | no (local compute/render/build only) | no | https://github.com/formatjs/formatjs | 2026-10-12 | rule 31 |
| is-array-buffer | 3.0.5 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/inspect-js/is-array-buffer | 2026-10-12 | rule 31 |
| is-async-function | 2.1.1 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/inspect-js/is-async-function | 2026-10-12 | rule 31 |
| is-bigint | 1.1.0 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/inspect-js/is-bigint | 2026-10-12 | rule 31 |
| is-boolean-object | 1.2.2 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/inspect-js/is-boolean-object | 2026-10-12 | rule 31 |
| is-bun-module | 2.0.0 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/SunsetTechuila/is-bun-module | 2026-10-12 | rule 31 |
| is-callable | 1.2.7 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/inspect-js/is-callable | 2026-10-12 | rule 31 |
| is-core-module | 2.16.2 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/inspect-js/is-core-module | 2026-10-12 | rule 31 |
| is-data-view | 1.0.2 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/inspect-js/is-data-view | 2026-10-12 | rule 31 |
| is-date-object | 1.1.0 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/inspect-js/is-date-object | 2026-10-12 | rule 31 |
| is-docker | 2.2.1 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/sindresorhus/is-docker | 2026-10-12 | rule 31 |
| is-extglob | 2.1.1 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/jonschlinkert/is-extglob | 2026-10-12 | rule 31 |
| is-finalizationregistry | 1.1.1 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/inspect-js/is-finalizationregistry | 2026-10-12 | rule 31 |
| is-fullwidth-code-point | 3.0.0 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/sindresorhus/is-fullwidth-code-point | 2026-10-12 | rule 31 |
| is-generator-function | 1.1.2 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/inspect-js/is-generator-function | 2026-10-12 | rule 31 |
| is-glob | 4.0.3 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/micromatch/is-glob | 2026-10-12 | rule 31 |
| is-map | 2.0.3 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/inspect-js/is-map | 2026-10-12 | rule 31 |
| is-negative-zero | 2.0.3 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/inspect-js/is-negative-zero | 2026-10-12 | rule 31 |
| is-number-object | 1.1.1 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/inspect-js/is-number-object | 2026-10-12 | rule 31 |
| is-number | 7.0.0 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/jonschlinkert/is-number | 2026-10-12 | rule 31 |
| is-regex | 1.2.1 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/inspect-js/is-regex | 2026-10-12 | rule 31 |
| is-set | 2.0.3 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/inspect-js/is-set | 2026-10-12 | rule 31 |
| is-shared-array-buffer | 1.0.4 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/inspect-js/is-shared-array-buffer | 2026-10-12 | rule 31 |
| is-string | 1.1.1 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/inspect-js/is-string | 2026-10-12 | rule 31 |
| is-symbol | 1.1.1 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/inspect-js/is-symbol | 2026-10-12 | rule 31 |
| is-typed-array | 1.1.15 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/inspect-js/is-typed-array | 2026-10-12 | rule 31 |
| is-weakmap | 2.0.2 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/inspect-js/is-weakmap | 2026-10-12 | rule 31 |
| is-weakref | 1.1.1 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/inspect-js/is-weakref | 2026-10-12 | rule 31 |
| is-weakset | 2.0.4 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/inspect-js/is-weakset | 2026-10-12 | rule 31 |
| is-wsl | 2.2.0 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/sindresorhus/is-wsl | 2026-10-12 | rule 31 |
| isarray | 2.0.5 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/juliangruber/isarray | 2026-10-12 | rule 31 |
| isexe | 2.0.0 | ISC | dev transitive | no (local compute/render/build only) | no | https://github.com/isaacs/isexe | 2026-10-12 | rule 31 |
| iterator.prototype | 1.1.5 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/ljharb/Iterator.prototype | 2026-10-12 | rule 31 |
| jpeg-js | 0.4.4 | BSD-3-Clause | dev transitive | no (local compute/render/build only) | no | https://github.com/eugeneware/jpeg-js | 2026-10-12 | rule 31 |
| js-library-detector | 6.7.0 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/johnmichel/Library-Detector-for-Chrome | 2026-10-12 | rule 31 |
| js-tokens | 4.0.0 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/lydell/js-tokens | 2026-10-12 | rule 31 |
| js-yaml | 4.1.1 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/nodeca/js-yaml | 2026-10-12 | rule 31 |
| jsesc | 3.1.0 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/mathiasbynens/jsesc | 2026-10-12 | rule 31 |
| json-buffer | 3.0.1 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/dominictarr/json-buffer | 2026-10-12 | rule 31 |
| json-schema-traverse | 0.4.1 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/epoberezkin/json-schema-traverse | 2026-10-12 | rule 31 |
| json-schema-traverse | 1.0.0 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/epoberezkin/json-schema-traverse | 2026-10-12 | rule 31 |
| json-stable-stringify-without-jsonify | 1.0.1 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/samn/json-stable-stringify | 2026-10-12 | rule 31 |
| json5 | 1.0.2 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/json5/json5 | 2026-10-12 | rule 31 |
| json5 | 2.2.3 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/json5/json5 | 2026-10-12 | rule 31 |
| jsx-ast-utils | 3.3.5 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/jsx-eslint/jsx-ast-utils | 2026-10-12 | rule 31 |
| keyv | 4.5.4 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/jaredwray/keyv | 2026-10-12 | rule 31 |
| language-subtag-registry | 0.3.23 | CC0-1.0 | dev transitive | no (local compute/render/build only) | no | https://github.com/mattcg/language-subtag-registry | 2026-10-12 | rule 31 |
| language-tags | 1.0.9 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/mattcg/language-tags | 2026-10-12 | rule 31 |
| legacy-javascript | 0.0.1 | Apache-2.0 | dev transitive | no (local compute/render/build only) | no | https://github.com/GoogleChrome/lighthouse | 2026-10-12 | rule 31 |
| levn | 0.4.1 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/gkz/levn | 2026-10-12 | rule 31 |
| lighthouse-logger | 2.0.2 | Apache-2.0 | dev transitive | no (local compute/render/build only) | no | https://github.com/GoogleChrome/lighthouse | 2026-10-12 | rule 31 |
| lighthouse-stack-packs | 1.12.3 | Apache-2.0 | dev transitive | no (local compute/render/build only) | no | https://github.com/GoogleChrome/lighthouse-stack-packs | 2026-10-12 | rule 31 |
| lighthouse | 13.5.0 | Apache-2.0 | dev direct | no (local compute/render/build only) | no | https://github.com/GoogleChrome/lighthouse | 2026-10-12 | rule 31 |
| lightningcss-win32-x64-msvc | 1.33.0 | MPL-2.0 | dev transitive | no (local compute/render/build only) | no | https://github.com/parcel-bundler/lightningcss | 2026-10-12 | rule 31 |
| lightningcss | 1.33.0 | MPL-2.0 | dev transitive | no (local compute/render/build only) | no | https://github.com/parcel-bundler/lightningcss | 2026-10-12 | rule 31 |
| locate-path | 6.0.0 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/sindresorhus/locate-path | 2026-10-12 | rule 31 |
| lodash-es | 4.18.1 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/lodash/lodash | 2026-10-12 | rule 31 |
| lodash.merge | 4.6.2 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/lodash/lodash | 2026-10-12 | rule 31 |
| lookup-closest-locale | 6.2.0 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/format-message/format-message | 2026-10-12 | rule 31 |
| loose-envify | 1.4.0 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/zertosh/loose-envify | 2026-10-12 | rule 31 |
| lru-cache | 5.1.1 | ISC | dev transitive | no (local compute/render/build only) | no | https://github.com/isaacs/node-lru-cache | 2026-10-12 | rule 31 |
| magic-string | 1.4.2 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/Rich-Harris/magic-string | 2026-10-12 | rule 31 |
| marky | 1.3.0 | Apache-2.0 | dev transitive | no (local compute/render/build only) | no | https://github.com/nolanlawson/marky | 2026-10-12 | rule 31 |
| math-intrinsics | 1.1.0 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/es-shims/math-intrinsics | 2026-10-12 | rule 31 |
| merge2 | 1.4.1 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/teambition/merge2 | 2026-10-12 | rule 31 |
| micromatch | 4.0.8 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/micromatch/micromatch | 2026-10-12 | rule 31 |
| minimatch | 10.2.5 | BlueOak-1.0.0 | dev transitive | no (local compute/render/build only) | no | https://github.com/isaacs/minimatch | 2026-10-12 | rule 31 |
| minimatch | 3.1.5 | ISC | dev transitive | no (local compute/render/build only) | no | https://github.com/isaacs/minimatch | 2026-10-12 | rule 31 |
| minimist | 1.2.8 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/minimistjs/minimist | 2026-10-12 | rule 31 |
| mitt | 3.0.1 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/developit/mitt | 2026-10-12 | rule 31 |
| modern-tar | 0.8.5 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/ayuhito/modern-tar | 2026-10-12 | rule 31 |
| module-details-from-path | 1.0.4 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/watson/module-details-from-path | 2026-10-12 | rule 31 |
| ms | 2.1.3 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/vercel/ms | 2026-10-12 | rule 31 |
| napi-postinstall | 0.3.4 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/un-ts/napi-postinstall | 2026-10-12 | rule 31 |
| natural-compare | 1.4.0 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/litejs/natural-compare-lite | 2026-10-12 | rule 31 |
| node-exports-info | 1.6.0 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/inspect-js/node-exports-info | 2026-10-12 | rule 31 |
| node-releases | 2.0.38 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/chicoxyzzy/node-releases | 2026-10-12 | rule 31 |
| object-assign | 4.1.1 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/sindresorhus/object-assign | 2026-10-12 | rule 31 |
| object-inspect | 1.13.4 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/inspect-js/object-inspect | 2026-10-12 | rule 31 |
| object-keys | 1.1.1 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/ljharb/object-keys | 2026-10-12 | rule 31 |
| object.assign | 4.1.7 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/ljharb/object.assign | 2026-10-12 | rule 31 |
| object.entries | 1.1.9 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/es-shims/Object.entries | 2026-10-12 | rule 31 |
| object.fromentries | 2.0.8 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/es-shims/Object.fromEntries | 2026-10-12 | rule 31 |
| object.groupby | 1.0.3 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/es-shims/Object.groupBy | 2026-10-12 | rule 31 |
| object.values | 1.2.1 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/es-shims/Object.values | 2026-10-12 | rule 31 |
| obug | 2.2.1 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/sxzz/obug | 2026-10-12 | rule 31 |
| open | 8.4.2 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/sindresorhus/open | 2026-10-12 | rule 31 |
| optionator | 0.9.4 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/gkz/optionator | 2026-10-12 | rule 31 |
| own-keys | 1.0.1 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/ljharb/own-keys | 2026-10-12 | rule 31 |
| p-limit | 3.1.0 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/sindresorhus/p-limit | 2026-10-12 | rule 31 |
| p-locate | 5.0.0 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/sindresorhus/p-locate | 2026-10-12 | rule 31 |
| parent-module | 1.0.1 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/sindresorhus/parent-module | 2026-10-12 | rule 31 |
| path-exists | 4.0.0 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/sindresorhus/path-exists | 2026-10-12 | rule 31 |
| path-key | 3.1.1 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/sindresorhus/path-key | 2026-10-12 | rule 31 |
| path-parse | 1.0.7 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/jbgutierrez/path-parse | 2026-10-12 | rule 31 |
| picomatch | 2.3.2 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/micromatch/picomatch | 2026-10-12 | rule 31 |
| picomatch | 4.0.7 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/micromatch/picomatch | 2026-10-12 | rule 31 |
| possible-typed-array-names | 1.1.0 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/ljharb/possible-typed-array-names | 2026-10-12 | rule 31 |
| postcss | 8.5.28 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/postcss/postcss | 2026-10-12 | rule 31 |
| prelude-ls | 1.2.1 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/gkz/prelude-ls | 2026-10-12 | rule 31 |
| prop-types | 15.8.1 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/facebook/prop-types | 2026-10-12 | rule 31 |
| punycode | 2.3.1 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/mathiasbynens/punycode.js | 2026-10-12 | rule 31 |
| puppeteer-core | 25.12.0 | Apache-2.0 | dev transitive | no (local compute/render/build only) | no | https://github.com/puppeteer/puppeteer/tree/main/packages/puppeteer-core | 2026-10-12 | rule 31 |
| queue-microtask | 1.2.3 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/feross/queue-microtask | 2026-10-12 | rule 31 |
| react-is | 16.13.1 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/facebook/react | 2026-10-12 | rule 31 |
| reflect.getprototypeof | 1.0.10 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/es-shims/Reflect.getPrototypeOf | 2026-10-12 | rule 31 |
| regexp.prototype.flags | 1.5.4 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/es-shims/RegExp.prototype.flags | 2026-10-12 | rule 31 |
| require-directory | 2.1.1 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/troygoode/node-require-directory | 2026-10-12 | rule 31 |
| require-from-string | 2.0.2 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/floatdrop/require-from-string | 2026-10-12 | rule 31 |
| require-in-the-middle | 8.0.1 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/nodejs/require-in-the-middle | 2026-10-12 | rule 31 |
| resolve-from | 4.0.0 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/sindresorhus/resolve-from | 2026-10-12 | rule 31 |
| resolve-pkg-maps | 1.0.0 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/privatenumber/resolve-pkg-maps | 2026-10-12 | rule 31 |
| resolve | 2.0.0-next.6 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/browserify/resolve | 2026-10-12 | rule 31 |
| reusify | 1.1.0 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/mcollina/reusify | 2026-10-12 | rule 31 |
| robots-parser | 3.0.1 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/samclarke/robots-parser | 2026-10-12 | rule 31 |
| rolldown | 1.2.11 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/rolldown/rolldown | 2026-10-12 | rule 31 |
| run-parallel | 1.2.0 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/feross/run-parallel | 2026-10-12 | rule 31 |
| safe-array-concat | 1.1.4 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/ljharb/safe-array-concat | 2026-10-12 | rule 31 |
| safe-push-apply | 1.0.0 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/ljharb/safe-push-apply | 2026-10-12 | rule 31 |
| safe-regex-test | 1.1.0 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/ljharb/safe-regex-test | 2026-10-12 | rule 31 |
| semver | 6.3.1 | ISC | dev transitive | no (local compute/render/build only) | no | https://github.com/npm/node-semver | 2026-10-12 | rule 31 |
| set-function-length | 1.2.2 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/ljharb/set-function-length | 2026-10-12 | rule 31 |
| set-function-name | 2.0.2 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/ljharb/set-function-name | 2026-10-12 | rule 31 |
| set-proto | 1.0.0 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/ljharb/set-proto | 2026-10-12 | rule 31 |
| shebang-command | 2.0.0 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/kevva/shebang-command | 2026-10-12 | rule 31 |
| shebang-regex | 3.0.0 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/sindresorhus/shebang-regex | 2026-10-12 | rule 31 |
| side-channel-list | 1.0.1 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/ljharb/side-channel-list | 2026-10-12 | rule 31 |
| side-channel-map | 1.0.1 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/ljharb/side-channel-map | 2026-10-12 | rule 31 |
| side-channel-weakmap | 1.0.2 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/ljharb/side-channel-weakmap | 2026-10-12 | rule 31 |
| side-channel | 1.1.1 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/ljharb/side-channel | 2026-10-12 | rule 31 |
| speedline-core | 1.4.3 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/paulirish/speedline | 2026-10-12 | rule 31 |
| stable-hash | 0.0.5 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/shuding/stable-hash | 2026-10-12 | rule 31 |
| std-env | 4.3.0 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/unjs/std-env | 2026-10-12 | rule 31 |
| stop-iteration-iterator | 1.1.0 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/ljharb/stop-iteration-iterator | 2026-10-12 | rule 31 |
| string-width | 4.2.3 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/sindresorhus/string-width | 2026-10-12 | rule 31 |
| string-width | 7.2.0 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/sindresorhus/string-width | 2026-10-12 | rule 31 |
| string-width | 8.3.0 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/sindresorhus/string-width | 2026-10-12 | rule 31 |
| string.prototype.includes | 2.0.1 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/mathiasbynens/String.prototype.includes | 2026-10-12 | rule 31 |
| string.prototype.matchall | 4.0.12 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/es-shims/String.prototype.matchAll | 2026-10-12 | rule 31 |
| string.prototype.repeat | 1.0.0 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/mathiasbynens/String.prototype.repeat | 2026-10-12 | rule 31 |
| string.prototype.trim | 1.2.10 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/es-shims/String.prototype.trim | 2026-10-12 | rule 31 |
| string.prototype.trimend | 1.0.9 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/es-shims/String.prototype.trimEnd | 2026-10-12 | rule 31 |
| string.prototype.trimstart | 1.0.8 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/es-shims/String.prototype.trimStart | 2026-10-12 | rule 31 |
| strip-ansi | 6.0.1 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/chalk/strip-ansi | 2026-10-12 | rule 31 |
| strip-ansi | 7.2.0 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/chalk/strip-ansi | 2026-10-12 | rule 31 |
| strip-bom | 3.0.0 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/sindresorhus/strip-bom | 2026-10-12 | rule 31 |
| strip-json-comments | 3.1.1 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/sindresorhus/strip-json-comments | 2026-10-12 | rule 31 |
| stubborn-fs | 2.0.0 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/fabiospampinato/stubborn-fs | 2026-10-12 | rule 31 |
| stubborn-utils | 1.0.2 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/fabiospampinato/stubborn-utils | 2026-10-12 | rule 31 |
| supports-color | 7.2.0 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/chalk/supports-color | 2026-10-12 | rule 31 |
| supports-preserve-symlinks-flag | 1.0.0 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/inspect-js/node-supports-preserve-symlinks-flag | 2026-10-12 | rule 31 |
| third-party-web | 0.30.0 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/patrickhulce/third-party-web | 2026-10-12 | rule 31 |
| tinybench | 6.2.0 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/tinylibs/tinybench | 2026-10-12 | rule 31 |
| tinyexec | 1.3.1 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/tinylibs/tinyexec | 2026-10-12 | rule 31 |
| tinyglobby | 0.2.17 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/SuperchupuDev/tinyglobby | 2026-10-12 | rule 31 |
| tldts-core | 7.4.16 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/remusao/tldts | 2026-10-12 | rule 31 |
| tldts-icann | 7.4.16 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/remusao/tldts | 2026-10-12 | rule 31 |
| to-regex-range | 5.0.1 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/micromatch/to-regex-range | 2026-10-12 | rule 31 |
| ts-api-utils | 2.5.0 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/JoshuaKGoldberg/ts-api-utils | 2026-10-12 | rule 31 |
| tsconfig-paths | 3.15.0 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/dividab/tsconfig-paths | 2026-10-12 | rule 31 |
| tsx | 4.22.0 | MIT | dev direct | no (local compute/render/build only) | no | https://github.com/privatenumber/tsx | 2026-10-12 | rule 31 |
| type-check | 0.4.0 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/gkz/type-check | 2026-10-12 | rule 31 |
| type-fest | 4.41.0 | (MIT OR CC0-1.0) | dev transitive | no (local compute/render/build only) | no | https://github.com/sindresorhus/type-fest | 2026-10-12 | rule 31 |
| typed-array-buffer | 1.0.3 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/inspect-js/typed-array-buffer | 2026-10-12 | rule 31 |
| typed-array-byte-length | 1.0.3 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/inspect-js/typed-array-byte-length | 2026-10-12 | rule 31 |
| typed-array-byte-offset | 1.0.4 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/inspect-js/typed-array-byte-offset | 2026-10-12 | rule 31 |
| typed-array-length | 1.0.7 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/inspect-js/typed-array-length | 2026-10-12 | rule 31 |
| typed-query-selector | 2.12.3 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/g-plane/typed-query-selector | 2026-10-12 | rule 31 |
| typescript-eslint | 8.59.2 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/typescript-eslint/typescript-eslint | 2026-10-12 | rule 31 |
| typescript | 5.9.3 | Apache-2.0 | dev direct | no (local compute/render/build only) | no | https://github.com/microsoft/TypeScript | 2026-10-12 | rule 31 |
| unbox-primitive | 1.1.0 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/ljharb/unbox-primitive | 2026-10-12 | rule 31 |
| undici-types | 6.21.0 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/nodejs/undici | 2026-10-12 | rule 31 |
| unrs-resolver | 1.11.1 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/unrs/unrs-resolver | 2026-10-12 | rule 31 |
| update-browserslist-db | 1.2.3 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/browserslist/update-db | 2026-10-12 | rule 31 |
| uri-js | 4.4.1 | BSD-2-Clause | dev transitive | no (local compute/render/build only) | no | https://github.com/garycourt/uri-js | 2026-10-12 | rule 31 |
| vite | 8.3.1 | MIT | dev direct | no (local compute/render/build only) | no | https://github.com/vitejs/vite | 2026-10-12 | rule 31 |
| vitest | 5.0.2 | MIT | dev direct | no (local compute/render/build only) | no | https://github.com/vitest-dev/vitest | 2026-10-12 | rule 31 |
| web-features | 3.40.1 | Apache-2.0 | dev transitive | no (local compute/render/build only) | no | https://github.com/web-platform-dx/web-features | 2026-10-12 | rule 31 |
| webdriver-bidi-protocol | 0.4.3 | Apache-2.0 | dev transitive | no (local compute/render/build only) | no | https://github.com/GoogleChromeLabs/webdriver-bidi-protocol | 2026-10-12 | rule 31 |
| when-exit | 2.1.5 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/fabiospampinato/when-exit | 2026-10-12 | rule 31 |
| which-boxed-primitive | 1.1.1 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/inspect-js/which-boxed-primitive | 2026-10-12 | rule 31 |
| which-builtin-type | 1.2.1 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/inspect-js/which-builtin-type | 2026-10-12 | rule 31 |
| which-collection | 1.0.2 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/inspect-js/which-collection | 2026-10-12 | rule 31 |
| which-typed-array | 1.1.20 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/inspect-js/which-typed-array | 2026-10-12 | rule 31 |
| which | 2.0.2 | ISC | dev transitive | no (local compute/render/build only) | no | https://github.com/isaacs/node-which | 2026-10-12 | rule 31 |
| why-is-node-running | 3.2.2 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/mafintosh/why-is-node-running | 2026-10-12 | rule 31 |
| word-wrap | 1.2.5 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/jonschlinkert/word-wrap | 2026-10-12 | rule 31 |
| wrap-ansi | 7.0.0 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/chalk/wrap-ansi | 2026-10-12 | rule 31 |
| wrap-ansi | 9.0.2 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/chalk/wrap-ansi | 2026-10-12 | rule 31 |
| ws | 8.22.0 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/websockets/ws | 2026-10-12 | rule 31 |
| xdg-basedir | 5.1.0 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/sindresorhus/xdg-basedir | 2026-10-12 | rule 31 |
| y18n | 5.0.8 | ISC | dev transitive | no (local compute/render/build only) | no | https://github.com/yargs/y18n | 2026-10-12 | rule 31 |
| yallist | 3.1.1 | ISC | dev transitive | no (local compute/render/build only) | no | https://github.com/isaacs/yallist | 2026-10-12 | rule 31 |
| yargs-parser | 21.1.1 | ISC | dev transitive | no (local compute/render/build only) | no | https://github.com/yargs/yargs-parser | 2026-10-12 | rule 31 |
| yargs-parser | 22.0.0 | ISC | dev transitive | no (local compute/render/build only) | no | https://github.com/yargs/yargs-parser | 2026-10-12 | rule 31 |
| yargs | 17.7.3 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/yargs/yargs | 2026-10-12 | rule 31 |
| yargs | 18.2.0 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/yargs/yargs | 2026-10-12 | rule 31 |
| yocto-queue | 0.1.0 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/sindresorhus/yocto-queue | 2026-10-12 | rule 31 |
| zod-validation-error | 4.0.2 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/causaly/zod-validation-error | 2026-10-12 | rule 31 |
| zod | 3.25.76 | MIT | dev transitive | no (local compute/render/build only) | no | https://github.com/colinhacks/zod | 2026-10-12 | rule 31 |