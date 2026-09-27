import type { Page } from "@playwright/test";

import { expect, test } from "./fixtures";
import { devSignIn, uniqueEmail } from "./dev-sign-in";
import { todayInHelsinki } from "../src/domain/dates";
import { t } from "../src/i18n/fi";

async function holdServer(page: Page): Promise<() => void> {
  let release!: () => void;
  const held = new Promise<void>((resolve) => (release = resolve));
  await page.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (
      request.method() === "POST" ||
      url.searchParams.has("_rsc") ||
      url.pathname.startsWith("/api/")
    )
      await held;
    await route.continue();
  });
  return release;
}

const busy = (page: Page) => page.locator('main [aria-busy="true"]');

test("a profile sub-tab marks itself and dims the page on the first click", async ({
  page,
}) => {
  await devSignIn(page, uniqueEmail("pending-tab"), "/profile/interests");
  const release = await holdServer(page);
  const tab = page
    .getByRole("navigation", { name: t.ui.nav.profile })
    .getByRole("link", { name: t.profile.tabs.regions });

  await tab.click();
  await expect(tab).toHaveAttribute("aria-current", "page");
  await expect(busy(page)).toHaveCount(1);

  release();
  await expect(page).toHaveURL(/\/profile\/regions$/);
  await expect(busy(page)).toHaveCount(0);
});

test("the trip form shows its pending state instead of reloading", async ({
  page,
}) => {
  const today = todayInHelsinki();
  await page.goto(`/trip?place=Helsinki&from=${today}&to=${today}`);
  const release = await holdServer(page);

  await page.getByRole("button", { name: t.pages.trip.planDaySubmit }).click();
  await expect(page.getByRole("button", { name: t.ui.updating })).toBeVisible();
  await expect(busy(page)).toHaveCount(1);

  release();
  await page.waitForURL(/\/trip\/day\?.*city=Helsinki/);
});

test("skipping onboarding shows progress until home loads", async ({
  page,
}) => {
  await devSignIn(page, uniqueEmail("pending-welcome"), "/welcome");
  const release = await holdServer(page);

  await page.getByRole("button", { name: t.onboarding.skip }).click();
  await expect(
    page.getByRole("button", { name: t.ui.updating }),
  ).toBeDisabled();

  release();
  await page.waitForURL((url) => url.pathname === "/");
});
