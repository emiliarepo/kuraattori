import { test, type Page } from "@playwright/test";

import { t } from "../../src/i18n/fi";
import { capture, isolatePage } from "./capture";
import { FROZEN_TODAY } from "./env";

test.beforeEach(async ({ page }) => {
  await isolatePage(page);
});

const PAGES: Record<string, string> = {
  home: "/",
  feed: "/feed",
  exhibitions: "/exhibitions",
  "exhibition-detail": "/exhibitions/oliver-beer-resonance-project-the-cave",
  museum: "/museums/nykytaiteen-museo-kiasma",
  "my-interested": "/my/interested",
  "my-visited": "/my/visited",
  "my-passport": "/my/passport",
  "my-year": `/my/year/${FROZEN_TODAY.slice(0, 4)}`,
  trip: `/trip?place=Helsinki&from=${FROZEN_TODAY}&to=${FROZEN_TODAY}`,
  "settings-interests": "/settings/interests",
  nearby: "/nearby?city=Helsinki",
};

for (const [name, path] of Object.entries(PAGES)) {
  test(name, async ({ page }) => {
    await open(page, path);
    await capture(page, name);
  });
}

test("trip day, planned", async ({ page }) => {
  await open(page, `/trip/day?city=Helsinki&date=${FROZEN_TODAY}`);
  const boxes = page
    .getByRole("listitem")
    .filter({ hasNotText: t.pages.day.closedOn })
    .getByRole("checkbox");
  await boxes.nth(0).check();
  await boxes.nth(1).check();
  await page.getByRole("button", { name: t.pages.day.plan }).click();
  await page.getByRole("region", { name: t.pages.day.itinerary }).waitFor();
  await capture(page, "trip-day-planned");
});

test("region selector open", async ({ page }) => {
  await open(page, "/");
  await page.getByRole("button", { name: t.ui.region.allRegions }).click();
  await page.getByRole("dialog", { name: t.ui.region.sheetTitle }).waitFor();
  await capture(page, "region-selector-open", { fullPage: false });
});

test.describe("signed out", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("landing", async ({ page }) => {
    await open(page, "/");
    await capture(page, "landing");
  });

  test("feed", async ({ page }) => {
    await open(page, "/feed");
    await capture(page, "home-signed-out");
  });
});

async function open(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
}
