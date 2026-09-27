import { e2eToday } from "./clock";
import { expect, test } from "./fixtures";
import { t } from "../src/i18n/fi";

test("trip lists ending-soon exhibitions first, highlighted", async ({
  page,
  assertPageClean,
}) => {
  const today = e2eToday();
  await page.goto(`/trip?from=${today}&to=${today}`);

  const headings = page.getByRole("heading", { level: 2 });
  await expect(
    headings.filter({ hasText: t.pages.trip.endingSoon }),
  ).toBeVisible();
  const titles = await headings.allInnerTexts();
  expect(titles.indexOf(t.pages.trip.endingSoon)).toBeLessThan(
    titles.indexOf(t.pages.trip.otherOpen),
  );

  const endingSoon = page.locator("section").filter({
    has: page.getByRole("heading", { name: t.pages.trip.endingSoon }),
  });
  const firstRow = endingSoon.getByRole("listitem").first();
  await expect(firstRow.getByText(t.pages.trip.endsDuringTrip)).toBeVisible();
  await expect(firstRow.locator(".bg-signal")).toHaveCount(1);
  assertPageClean();
});

test("day planner puts ending-soon candidates first and walking legs between stops", async ({
  page,
  assertPageClean,
}) => {
  const today = e2eToday();
  await page.goto(`/trip/day?city=Helsinki&date=${today}`);

  const candidates = page
    .getByRole("listitem")
    .filter({ has: page.getByRole("checkbox") });
  await expect(candidates.first().locator(".border-signal")).toHaveText(
    /jäljellä|tänään/i,
  );
  await expect(candidates.last().locator(".border-signal")).toHaveCount(0);

  const boxes = page.getByRole("checkbox");
  await boxes.nth(0).check();
  await boxes.nth(1).check();
  await boxes.nth(2).check();
  await page.getByRole("button", { name: t.pages.day.plan }).click();

  const itinerary = page.getByRole("region", { name: t.pages.day.itinerary });
  const stops = itinerary.getByRole("listitem");
  await expect(stops).toHaveCount(3);

  const legs = itinerary.getByText(/min kävellen/);
  const routes = itinerary.getByRole("link", { name: /^Kävelyreitti/ });
  const legCount = await legs.count();
  expect(legCount).toBeGreaterThan(0);
  await expect(routes).toHaveCount(legCount);
  await expect(stops.last().getByText(/min kävellen/)).toHaveCount(0);

  for (let index = 0; index < legCount; index++) {
    const leg = await legs.nth(index).boundingBox();
    const stopTitle = await stops
      .nth(index)
      .getByRole("link")
      .first()
      .boundingBox();
    const nextStop = await stops.nth(index + 1).boundingBox();
    expect(leg!.y).toBeGreaterThan(stopTitle!.y + stopTitle!.height);
    expect(leg!.y + leg!.height).toBeLessThanOrEqual(nextStop!.y);
  }
  assertPageClean();
});
