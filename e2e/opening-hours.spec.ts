import { readFileSync } from "node:fs";
import { join } from "node:path";

import { e2eToday, fixtureShiftDays, rotateWeek } from "./clock";
import { addDays } from "../src/domain/dates";
import { expect, test } from "./fixtures";
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
const fixtureHours = parseOpeningHours(kiasmaHtml)!;
const kiasmaHours = {
  ...fixtureHours,
  days: rotateWeek(fixtureHours.days, fixtureShiftDays()),
};
// The seed shifts free days with the rest of the fixtures (e2e/clock.ts).
const kiasmaFreeDays = parseFreeDays(kiasmaHtml).map((day) =>
  addDays(day, fixtureShiftDays()),
);

test("museum page lists the week's hours with today marked", async ({
  page,
  assertPageClean,
}) => {
  const today = e2eToday();
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
      t.pages.hours.nextFreeDay(formatDayMonth(freeDay, "fi")),
    );
  assertPageClean();
});

test("exhibition page says whether the museum is open today", async ({
  page,
  assertPageClean,
}) => {
  const today = e2eToday();
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
      t.pages.hours.nextFreeDay(formatDayMonth(freeDay, "fi")),
    );
  assertPageClean();
});

test("day planner leaves out a museum that is closed that day", async ({
  page,
  assertPageClean,
}) => {
  // Kiasma's seeded exhibitions are open again from 9.10.2026 (shifted) on.
  const reopens = addDays("2026-10-09", fixtureShiftDays());
  const from = e2eToday() > reopens ? e2eToday() : reopens;
  const closedDay = [0, 1, 2, 3, 4, 5, 6]
    .map((offset) => addDays(from, offset))
    .find((date) => !hoursOn(kiasmaHours.days, date))!;
  await page.goto(`/trip/day?city=Helsinki&date=${closedDay}`);

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
