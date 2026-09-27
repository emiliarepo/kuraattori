import { expect, test } from "./fixtures";
import { devSignIn, uniqueEmail } from "./dev-sign-in";
import { todayInHelsinki } from "../src/domain/dates";
import { t } from "../src/i18n/fi";

test("plan a museum day from the trip tab and save it", async ({
  page,
  assertPageClean,
  resetPageClean,
}) => {
  const today = todayInHelsinki();
  await devSignIn(page, uniqueEmail("day-planner"), "/");
  resetPageClean();

  await page
    .getByRole("navigation", { name: "Päänavigaatio" })
    .getByRole("link", { name: t.ui.nav.trip })
    .first()
    .click();
  await page.waitForURL("**/trip");
  await page.goto(`/trip?place=Helsinki&from=${today}&to=${today}`);
  await page.getByRole("button", { name: t.pages.trip.planDaySubmit }).click();
  await page.waitForURL(/\/trip\/day\?.*city=Helsinki/);

  const boxes = page
    .getByRole("listitem")
    .filter({ hasNotText: t.pages.day.closedOn })
    .getByRole("checkbox");
  await boxes.nth(0).check();
  await boxes.nth(1).check();
  await page.getByRole("button", { name: t.pages.day.plan }).click();

  const itinerary = page.getByRole("region", { name: t.pages.day.itinerary });
  await expect(itinerary.getByRole("listitem")).toHaveCount(2);
  await expect(
    itinerary.getByRole("link", { name: t.pages.day.showRoute }),
  ).toHaveAttribute("href", /google\.com\/maps\/dir\/|maps\.apple\.com/);

  const calendarHref = await itinerary
    .getByRole("link", { name: t.pages.day.addToCalendar })
    .getAttribute("href");
  const calendar = await page.request.get(calendarHref!);
  expect(calendar.headers()["content-type"]).toContain("text/calendar");
  expect((await calendar.text()).match(/BEGIN:VEVENT/g)).toHaveLength(2);

  await itinerary.getByRole("button", { name: t.pages.trip.save }).click();
  await expect(page.getByText(t.pages.trip.saved)).toBeVisible();
  await expect(
    page.getByRole("region", { name: t.pages.trip.savedTrips }),
  ).toContainText("Helsinki");

  const planUrl = page.url();
  await page.goto("/");
  await page.goBack();
  expect(page.url()).toBe(planUrl);
  await expect(itinerary.getByRole("listitem")).toHaveCount(2);
  assertPageClean();
});
