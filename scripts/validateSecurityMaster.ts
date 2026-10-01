/**
 * Entry shim (N1 follow-up pattern): the implementation imports the
 * server-only seed dataset and the admin Supabase client, so it must
 * run with the react-server condition.
 *
 * Acceptance invocation (roadmap D1-02):
 *   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *     npx tsx scripts/validateSecurityMaster.ts
 */
import { runWithServerCondition } from "./runWithServerCondition";

runWithServerCondition(new URL("./validateSecurityMasterImpl.ts", import.meta.url));
