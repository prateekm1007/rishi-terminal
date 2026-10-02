import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./test/smoke",
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
