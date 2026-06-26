import { defineConfig } from "@playwright/test";

// Single-browser run. The webServer starts the production build; CI runs
// `npm run build` before `npm run e2e`. Locally, set E2E_BASE_URL to point at an
// already-running dev server (e.g. http://localhost:3100) to skip the build.
const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["html", { open: "never" }], ["list"]] : "list",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run start",
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      SERVICE_MODE: "mock",
      STORAGE_DRIVER: "mock",
      QUEUE_DRIVER: "memory",
      EMAIL_DRIVER: "mock",
    },
  },
});
