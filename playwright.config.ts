import { defineConfig, devices } from "@playwright/test";

import {
  APP_BASE_URL,
  APP_LOG_PATH,
  APP_PORT,
  MAINTENANCE_BASE_URL,
  MAINTENANCE_LOG_PATH,
  MAINTENANCE_PERSIST_DIR,
  MAINTENANCE_PORT,
  PROD_CHECK_BASE_URL,
  PROD_CHECK_PORT,
} from "./e2e/env";

const APP_PERSIST_DIR = ".wrangler/state-e2e";
const PROD_CHECK_PERSIST_DIR = ".wrangler/state-e2e-prodcheck";
// A built Worker always requires `AUTH_SECRET` (next.build inlines
// NODE_ENV=production, so `src/env.js` treats it as required) — this is a
// throwaway value for the local, ephemeral test servers only, never a real
// secret and never used by a deploy.
const TEST_AUTH_SECRET = "e2e-test-only-secret";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    locale: "fi-FI",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "e2e",
      testIgnore: [
        "**/accessibility.spec.ts",
        "**/auth-providers.spec.ts",
        "**/maintenance.spec.ts",
        "**/visual/**",
      ],
      use: {
        ...devices["Desktop Chrome"],
        baseURL: APP_BASE_URL,
        viewport: { width: 1280, height: 800 },
      },
    },
    {
      name: "a11y",
      testMatch: "**/accessibility.spec.ts",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: APP_BASE_URL,
        viewport: { width: 390, height: 844 },
      },
    },
    {
      name: "auth-providers",
      testMatch: "**/auth-providers.spec.ts",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: PROD_CHECK_BASE_URL,
      },
    },
    {
      name: "maintenance",
      testMatch: "**/maintenance.spec.ts",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: MAINTENANCE_BASE_URL,
      },
    },
  ],
  webServer: [
    {
      name: "app",
      command: `tsx scripts/e2e-server.ts ${APP_LOG_PATH} -- --port ${APP_PORT} --persist-to ${APP_PERSIST_DIR} --var E2E_TEST_AUTH:1 --var E2E_BROWSE_PAGE_SIZE:5 --var NEXTJS_ENV:development --var AUTH_SECRET:${TEST_AUTH_SECRET}`,
      url: `${APP_BASE_URL}/api/auth/providers`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      stdout: "pipe",
    },
    {
      name: "prod-check",
      // No `E2E_TEST_AUTH` or `NEXTJS_ENV`: this mirrors the real deployed
      // Worker as closely as a local build can, for `auth-providers.spec.ts`.
      command: `wrangler dev --port ${PROD_CHECK_PORT} --persist-to ${PROD_CHECK_PERSIST_DIR} --var AUTH_SECRET:${TEST_AUTH_SECRET}`,
      url: `${PROD_CHECK_BASE_URL}/api/auth/providers`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      name: "maintenance-server",
      // Its own server and persisted KV, so setting the maintenance flag
      // mid-test (maintenance.spec.ts) can't 503 the other projects' shared
      // "app" server. `NEXTJS_ENV:development` turns on the D1 read-budget
      // log line (src/server/db/read-budget.ts), which the test reads to
      // prove the flag short-circuits before any D1 access. `port`, not
      // `url`, for readiness: the flag may already be set by a previous,
      // interrupted run, which would make an `/api/...` readiness URL 503
      // forever.
      command: `tsx scripts/e2e-server.ts ${MAINTENANCE_LOG_PATH} -- --port ${MAINTENANCE_PORT} --persist-to ${MAINTENANCE_PERSIST_DIR} --var NEXTJS_ENV:development --var AUTH_SECRET:${TEST_AUTH_SECRET}`,
      port: MAINTENANCE_PORT,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
