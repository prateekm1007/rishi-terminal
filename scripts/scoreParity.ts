/**
 * Entry shim (N1 follow-up): `npx tsx scripts/scoreParity.ts` — the
 * roadmap DoD's verbatim invocation — must work. The implementation
 * imports the server-only scoring engine, so it needs the react-server
 * condition; this shim re-execs it with the flag (see
 * runWithServerCondition.ts). `npm run score:parity` invokes the
 * implementation directly.
 */
import { runWithServerCondition } from "./runWithServerCondition";

runWithServerCondition(new URL("./scoreParityImpl.ts", import.meta.url));
