/**
 * Entry shim (N1 follow-up pattern): the implementation imports the
 * server-only seed dataset, so it must run with the react-server
 * condition. `npx tsx scripts/populateSecurityMaster.ts` re-execs
 * the implementation with the flag (see runWithServerCondition.ts).
 */
import { runWithServerCondition } from "./runWithServerCondition";

runWithServerCondition(new URL("./populateSecurityMasterImpl.ts", import.meta.url));
