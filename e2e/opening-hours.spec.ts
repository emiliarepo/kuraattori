import { readFileSync } from "node:fs";
import { join } from "node:path";

import { expect, test } from "./fixtures";
import { todayInHelsinki } from "../src/domain/dates";
import {
  formatHours,
  hoursOn,
  nextFreeDay,
  weekdayIndex,
} from "../src/domain/opening-hours";
import { t } from "../src/i18n/fi";
import { formatDayMonth } from "../src/i18n/format";
import {
  parseFreeDays,
  parseOpeningHours,
} from "../src/server/import/museot-fi/parse-museum";

const kiasmaHtml = readFileSync(
  join(import.meta.dirname, "../fixtures/museot/museum-21118.html"),
  "utf-8",
);
const kiasmaHours = parseOpeningHours(kiasmaHtml)!;
const kiasmaFreeDays = parseFreeDays(kiasmaHtml);

function nextMonday(from: string): string {
  const date = new Date(`${from}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 7 - weekdayIndex(from));
  return date.toISOString().slice(0, 10);
}

test("museum page lists the week's hours with today marked", async ({
  page,
  assertPageClean,
}) => {
  const today = todayInHelsinki();
  await page.goto("/museums/nykytaiteen-museo-kiasma");

  const hours = page.getByRole("region", { name: t.pages.hours.title });
  await expect(hours.locator("dt")).toHaveCount(7);
  const todayRow = hours.locator('[aria-current="date"]');
  await expect(todayRow).toContainText(
    t.pages.hours.weekdays[weekdayIndex(today)]!,
  );
  const todayHours = hoursOn(kiasmaHours.days, today);
  await expect(todayRow).toContainText(
    todayHours ? formatHours(todayHours) : t.pages.hours.closed,
  );

  const freeDay = nextFreeDay(kiasmaFreeDays, today);
  if (freeDay)
    await expect(hours).toContainText(
      t.pages.hours.nextFreeDay(formatDayMonth(freeDay)),
    );
  assertPageClean();
});

test("exhibition page says whether the museum is open today", async ({
  page,
  assertPageClean,
}) => {
  const today = todayInHelsinki();
  await page.goto("/museums/nykytaiteen-museo-kiasma");
  await page
    .getByRole("link", { name: /Edith Karlson/ })
    .first()
    .click();
  await expect(
    page.getByRole("heading", { name: /Edith Karlson/, level: 1 }),
  ).toBeVisible();

  const todayHours = hoursOn(kiasmaHours.days, today);
  const meta = page.locator("aside dl");
  await expect(meta).toContainText(
    todayHours
      ? t.pages.hours.openToday(formatHours(todayHours))
      : t.pages.hours.closedToday,
  );
  const freeDay = nextFreeDay(kiasmaFreeDays, today, 14);
  if (freeDay)
    await expect(meta).toContainText(
      t.pages.hours.nextFreeDay(formatDayMonth(freeDay)),
    );
  assertPageClean();
});

test("day planner leaves out a museum that is closed that day", async ({
  page,
  assertPageClean,
}) => {
  // Kiasma's seeded exhibitions are open again from 9.10.2026 on.
  const today = todayInHelsinki();
  const monday = nextMonday(today > "2026-10-09" ? today : "2026-10-09");
  await page.goto(`/trip/day?city=Helsinki&date=${monday}`);

  const candidates = page.getByRole("listitem");
  const kiasma = candidates.filter({ hasText: "Nykytaiteen museo Kiasma" });
  await expect(kiasma.first()).toContainText(t.pages.day.closedOn);

  await kiasma.first().getByRole("checkbox").check();
  await candidates
    .filter({ hasNotText: t.pages.day.closedOn })
    .first()
    .getByRole("checkbox")
    .check();
  await page.getByRole("button", { name: t.pages.day.plan }).click();

  await expect(page.getByText(t.pages.day.closedStops)).toBeVisible();
  const itinerary = page.getByRole("region", { name: t.pages.day.itinerary });
  await expect(itinerary.getByRole("listitem")).toHaveCount(1);
  await expect(itinerary).not.toContainText("Nykytaiteen museo Kiasma");
  assertPageClean();
});
