/**
 * runWithServerCondition — re-exec a tsx script with the react-server
 * condition (N1 follow-up).
 *
 * Why: the seed dataset and the scoring engine are `server-only` (N1) —
 * the Next.js build fails if a client module imports them. Node resolves
 * the `server-only` package through its exports conditions: with
 * `--conditions react-server` it is a no-op, without it the import
 * THROWS. package.json entries (`validate:stocks`, `score:parity`) pass
 * the flag, but the roadmap's Definition of Done invokes the files
 * verbatim (`npx tsx scripts/validateStocks.ts`) — a bare invocation
 * must work too. An entry shim calls this helper, which re-execs the
 * implementation with the condition and forwards the exit code.
 *
 * The entry shim contains NO seed imports, so it loads cleanly; only the
 * re-exec'd implementation pulls the server-only graph. The build-time
 * client-bundle guarantee is untouched (it comes from the static
 * `import 'server-only'` inside the implementation, which the bundler
 * still sees).
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export function runWithServerCondition(implUrl: URL | string): never {
  const res = spawnSync(
    process.execPath,
    [
      "--import",
      "tsx",
      "--conditions",
      "react-server",
      typeof implUrl === "string" ? fileURLToPath(new URL(implUrl)) : fileURLToPath(implUrl),
      ...process.argv.slice(2),
    ],
    { stdio: "inherit", env: process.env },
  );
  // Guard against spawn-level failure (node/tsx missing) — surface it,
  // never exit 0 by accident.
  if (res.error) {
    console.error("runWithServerCondition: failed to re-exec:", res.error.message);
    process.exit(1);
  }
  process.exit(res.status ?? 1);
}
