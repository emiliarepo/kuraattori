import { defineConfig, devices, type Project } from "@playwright/test";

import {
  FROZEN_NOW,
  VISUAL_BASE_URL,
  VISUAL_PERSIST_DIR,
  VISUAL_PORT,
  VISUAL_STORAGE_STATE,
} from "./e2e/visual/env";

const VIEWPORTS = {
  mobile: { width: 390, height: 844 },
  desktop: { width: 1280, height: 800 },
} as const;
const SCHEMES = ["light", "dark"] as const;

const screenshotProjects: Project[] = Object.entries(VIEWPORTS).flatMap(
  ([size, viewport]) =>
    SCHEMES.map((colorScheme) => ({
      name: `${size}-${colorScheme}`,
      testMatch: "**/*.visual.ts",
      dependencies: ["setup"],
      use: {
        ...devices["Desktop Chrome"],
        viewport,
        colorScheme,
        reducedMotion: "reduce",
        storageState: VISUAL_STORAGE_STATE,
      },
    })),
);

/**
 * Screenshot baselines are only valid from the pinned Playwright Docker image
 * (`scripts/visual-docker.sh`, the `visual` job in deploy.yml); `{platform}`
 * in the path keeps a stray host run from comparing against them.
 */
export default defineConfig({
  testDir: "./e2e/visual",
  snapshotPathTemplate:
    "{testDir}/__screenshots__/{platform}/{projectName}/{arg}{ext}",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  expect: {
    toHaveScreenshot: {
      maxDiffPixels: 20,
      animations: "disabled",
      caret: "hide",
      scale: "css",
    },
  },
  use: {
    baseURL: VISUAL_BASE_URL,
    locale: "fi-FI",
    timezoneId: "Europe/Helsinki",
    reducedMotion: "reduce",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "setup",
      testMatch: "**/seed-user.setup.ts",
      use: { ...devices["Desktop Chrome"] },
    },
    ...screenshotProjects,
  ],
  webServer: {
    command: `wrangler dev --port ${VISUAL_PORT} --persist-to ${VISUAL_PERSIST_DIR} --var E2E_TEST_AUTH:1 --var E2E_FROZEN_NOW:${FROZEN_NOW} --var AUTH_SECRET:e2e-test-only-secret`,
    url: `${VISUAL_BASE_URL}/api/auth/providers`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
