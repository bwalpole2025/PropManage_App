import { defineConfig } from "@playwright/test";

// Single-browser smoke run. The webServer starts the production build; CI runs
// `npm run build` before `npm run e2e`.
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["html", { open: "never" }], ["list"]] : "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run start",
    url: "http://localhost:3000",
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
