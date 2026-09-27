import type { Page } from "@playwright/test";

import { t } from "../src/i18n/fi";

/**
 * A fresh email per call: dev sign-in upserts a user by email, and tests run
 * in parallel (with CI retries re-running a whole test) against one shared
 * D1 database, so a fixed email would leak state between runs.
 */
export function uniqueEmail(label: string): string {
  return `${label}-${crypto.randomUUID()}@e2e.kuraattori.local`;
}

/**
 * Signs in through the test-only dev credentials provider (see
 * `src/server/auth/test-auth.ts`). Each caller should pass a unique `email`:
 * tests run in parallel against one shared D1 database, and the dev provider
 * upserts a user row per email.
 */
export async function devSignIn(
  page: Page,
  email: string,
  callbackUrl = "/",
): Promise<void> {
  await page.goto(`/sign-in?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  await page.getByLabel(t.auth.signIn.devEmailLabel).fill(email);
  await page.getByRole("button", { name: t.auth.signIn.devSubmit }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/sign-in"));
  // The server action's own client-side transition to `callbackUrl`
  // sometimes lands with an unrelated chunk-loading error (reproduces even
  // outside this suite, worth its own investigation) — a real navigation to
  // the same URL always renders correctly, so land on one of those instead
  // of the flaky transition.
  await page.goto(page.url());
}
