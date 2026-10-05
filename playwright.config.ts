import { defineConfig } from "@playwright/test";

export default defineConfig({
  // R4-06: testDir widened from ./test/smoke to ./test so the roadmap's
  // verbatim command `npx playwright test test/e2e/i18n.spec.ts` resolves
  // alongside the smoke suite (Playwright filters by full path).
  // testMatch keeps the Vitest unit suites (*.test.ts) OUT of Playwright's
  // collector — Playwright owns *.spec.ts only.
  testDir: "./test",
  testMatch: "**/*.spec.ts",
  timeout: 60_000,
  retries: 0,
  use: {
    baseURL: process.env.SMOKE_BASE_URL ?? "http://localhost:3000",
    headless: true,
  },
  webServer: process.env.SMOKE_BASE_URL
    ? undefined
    : {
        command: "npm run start",
        port: 3000,
        timeout: 120_000,
        reuseExistingServer: true,
        // U4: the smoke suite pins the ranked widgets (Top Buy section +
        // its mandated seed banner). CI runs without project env vars, so
        // without this the homepage renders the (honest) disabled state
        // and the ranked-surface assertions have nothing to find. The flag
        // is the founder's product decision; the smoke server explicitly
        // exercises the ENABLED path.
        env: { RANKINGS_ENABLED: "true" },
      },
});
