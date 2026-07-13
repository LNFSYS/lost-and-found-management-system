import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.E2E_WEB_URL ?? "http://localhost:4173";

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./playwright-results",
  timeout: 30_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure"
  },
  webServer: process.env.E2E_WEB_URL
    ? undefined
    : {
        command: "npm run dev -- --host localhost --port 4173",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 60_000
      },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }]
});
