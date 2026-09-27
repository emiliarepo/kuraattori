import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { Page } from "@playwright/test";

import { expect, test } from "./fixtures";
import { addDays, todayInHelsinki } from "../src/domain/dates";
import { helsinkiClock } from "../src/domain/nearby";
import { formatTime, hoursOn, toMinutes } from "../src/domain/opening-hours";
import { t } from "../src/i18n/fi";
import {
  parseMuseumPage,
  parseOpeningHours,
} from "../src/server/import/museot-fi/parse-museum";

const kiasmaHtml = readFileSync(
  join(import.meta.dirname, "../fixtures/museot/museum-21118.html"),
  "utf-8",
);
const kiasmaHours = parseOpeningHours(kiasmaHtml)!.days;
const kiasma = parseMuseumPage(kiasmaHtml)!;
const kiasmaAt = { latitude: kiasma.latitude!, longitude: kiasma.longitude! };
const KIASMA = "Nykytaiteen museo Kiasma";

/** The first day from today on which Kiasma is open. */
const openDay = [0, 1, 2, 3, 4, 5, 6]
  .map((offset) => addDays(todayInHelsinki(), offset))
  .find((date) => hoursOn(kiasmaHours, date))!;
const openDayHours = hoursOn(kiasmaHours, openDay)!;

/** The instant when the Helsinki wall clock shows `minutes` on `date`. */
function helsinkiInstant(date: string, minutes: number): Date {
  const guess = new Date(`${date}T00:00:00Z`);
  guess.setUTCMinutes(minutes - 180);
  const drift = helsinkiClock(guess).minutes - minutes;
  return new Date(guess.getTime() - drift * 60_000);
}

async function openFromHome(page: Page) {
  await page.goto("/");
  await page
    .getByRole("link", { name: new RegExp(t.pages.nearby.banner) })
    .click();
  await page.waitForURL("**/nearby");
}

test.describe("with a granted location", () => {
  test.use({ permissions: ["geolocation"], geolocation: kiasmaAt });

  test("the home banner locates and lists Kiasma as open, with its hours and map link", async ({
    page,
    assertPageClean,
  }) => {
    const noon = 12 * 60;
    await page.clock.setFixedTime(helsinkiInstant(openDay, noon));
    await openFromHome(page);

    const results = page.getByRole("list", { name: t.pages.nearby.title });
    const row = results
      .getByRole("listitem")
      .filter({ hasText: KIASMA })
      .first();
    await expect(row).toBeVisible();
    await expect(row).toContainText(
      t.pages.nearby.openUntil(formatTime(openDayHours.close)),
    );
    await expect(row).toContainText(/0,\d km · \d+ min kävellen/);
    await expect(row).not.toContainText(t.pages.nearby.closingSoon);
    await expect(
      row.getByRole("link", {
        name: `${t.pages.museums.showOnMap}: ${KIASMA}`,
      }),
    ).toHaveAttribute("href", /google\.com\/maps|maps\.apple\.com/);
    assertPageClean();
  });

  test("marks a museum closing within 45 minutes", async ({ page }) => {
    await page.clock.setFixedTime(
      helsinkiInstant(openDay, toMinutes(openDayHours.close) - 30),
    );
    await openFromHome(page);
    await expect(
      page.getByRole("listitem").filter({ hasText: KIASMA }).first(),
    ).toContainText(t.pages.nearby.closingSoon);
  });

  test("lists every nearby museum with its opening time when nothing is open", async ({
    page,
  }) => {
    await page.clock.setFixedTime(helsinkiInstant(openDay, 3 * 60));
    await openFromHome(page);
    await expect(page.getByText(t.pages.nearby.showingAll)).toBeVisible();
    await expect(
      page.getByRole("listitem").filter({ hasText: KIASMA }).first(),
    ).toContainText(/Suljettu · avautuu tänään klo /);
  });

  test("a plain page load does not ask for the location", async ({ page }) => {
    await page.addInitScript(() => {
      const calls = { count: 0 };
      Object.assign(window, { geolocationCalls: calls });
      const original = navigator.geolocation.getCurrentPosition.bind(
        navigator.geolocation,
      );
      navigator.geolocation.getCurrentPosition = (...args) => {
        calls.count++;
        original(...args);
      };
    });
    await page.goto("/nearby");
    await expect(
      page.getByRole("button", { name: t.pages.nearby.locate }),
    ).toBeVisible();
    const calls = () =>
      page.evaluate(
        () =>
          (window as unknown as { geolocationCalls: { count: number } })
            .geolocationCalls.count,
      );
    expect(await calls()).toBe(0);
    await page.getByRole("button", { name: t.pages.nearby.locate }).click();
    await expect(
      page.getByRole("heading", { name: t.pages.nearby.nearYou, exact: true }),
    ).toBeVisible();
    expect(await calls()).toBe(1);
  });
});

test.describe("further away", () => {
  // About 3 km north of Kiasma.
  test.use({
    permissions: ["geolocation"],
    geolocation: {
      latitude: kiasmaAt.latitude + 0.027,
      longitude: kiasmaAt.longitude,
    },
  });

  test("widening the radius brings Kiasma in", async ({ page }) => {
    await page.clock.setFixedTime(helsinkiInstant(openDay, 12 * 60));
    await openFromHome(page);
    const results = page.getByRole("region", {
      name: t.pages.nearby.nearYou,
      exact: true,
    });
    await expect(
      results.getByRole("listitem").filter({ hasText: KIASMA }),
    ).toHaveCount(0);
    await results
      .getByRole("button", { name: t.pages.nearby.radiusOption(5) })
      .click();
    await expect(
      results.getByRole("listitem").filter({ hasText: KIASMA }).first(),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/nearby\?km=5$/);
  });
});

test("a denied location falls back to choosing a city", async ({
  page,
  context,
}) => {
  await context.clearPermissions();
  await page.clock.setFixedTime(helsinkiInstant(openDay, 12 * 60));
  await openFromHome(page);
  await expect(page.getByText(t.pages.nearby.denied)).toBeVisible();

  await page
    .getByRole("combobox", { name: t.pages.nearby.city })
    .selectOption("Helsinki");
  await page.getByRole("button", { name: t.pages.nearby.showCity }).click();
  await expect(page).toHaveURL(/\/nearby\?city=Helsinki/);
  await expect(
    page.getByRole("heading", { name: t.pages.nearby.nearCity("Helsinki") }),
  ).toBeVisible();
  await expect(
    page.getByRole("listitem").filter({ hasText: KIASMA }).first(),
  ).toBeVisible();
});
