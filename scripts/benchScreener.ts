/**
 * Entry shim (X3-05): `npx tsx scripts/benchScreener.ts --universe` —
 * the roadmap acceptance's verbatim invocation — must work. The
 * implementation imports the server-only slim index, so it needs the
 * react-server condition; this shim re-execs it with the flag (see
 * runWithServerCondition.ts — the established scoreParity pattern).
 */
import { runWithServerCondition } from "./runWithServerCondition";

runWithServerCondition(new URL("./benchScreenerImpl.ts", import.meta.url));
