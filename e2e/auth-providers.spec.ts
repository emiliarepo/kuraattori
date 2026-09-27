import { expect, test } from "@playwright/test";

/**
 * Runs against the `prod-check` server (playwright.config.ts): the same
 * built Worker as `app`, but without `E2E_TEST_AUTH` — as close to the real
 * deployed build as a local run gets. If this ever lists `dev`, the test-only
 * credentials provider (src/server/auth/test-auth.ts) has leaked into a
 * production-shaped build.
 */
test("the production build's /api/auth/providers lists only Google", async ({
  request,
}) => {
  const response = await request.get("/api/auth/providers");
  expect(response.ok()).toBe(true);
  const providers = await response.json();
  expect(Object.keys(providers)).toEqual(["google"]);
});
