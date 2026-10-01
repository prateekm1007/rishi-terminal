/**
 * Entry shim (N1 follow-up): `npx tsx scripts/validateStocks.ts` — the
 * roadmap DoD's verbatim invocation — must work. The implementation
 * imports the server-only seed, so it needs the react-server condition;
 * this shim re-execs it with the flag (see runWithServerCondition.ts).
 * `npm run validate:stocks` invokes the implementation directly.
 */
import { runWithServerCondition } from "./runWithServerCondition";

runWithServerCondition(new URL("./validateStocksImpl.ts", import.meta.url));
