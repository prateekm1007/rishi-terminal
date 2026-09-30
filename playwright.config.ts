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
      },
});
