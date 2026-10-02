import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      // 'server-only' throws outside a React Server environment — stub it
      // for unit tests (the guard still applies in the real Next.js build).
      "server-only": path.resolve(__dirname, "test/stubs/server-only.ts"),
    },
  },
  test: {
    // N.B. .mjs tests import the probe-contract modules under scripts/lib/
    // (plain ESM, no TS types) — included explicitly so the canary
    // contract is unit-gated.
    include: ["test/**/*.test.ts", "test/**/*.test.mjs"],
    environment: "node",
    setupFiles: ["test/setup.ts"],
    testTimeout: 30_000,
  },
});
