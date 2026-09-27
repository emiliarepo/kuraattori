import type { Page } from "@playwright/test";

import { expect, test } from "./fixtures";
import { devSignIn, uniqueEmail } from "./dev-sign-in";
import { t } from "../src/i18n/fi";

test("a visited museum shows a stamp in the Museopassi", async ({
  page,
  assertPageClean,
  resetPageClean,
}) => {
  await markIntervallumVisited(page, uniqueEmail("passport"));
  resetPageClean();

  await page.goto("/my/passport");
  const stamp = page.getByRole("link", {
    name: /^Museopassi-leima: LUOMUS Kaisaniemen kasvitieteellinen puutarha, Helsinki, käyty \d{1,2}\.\d{1,2}\.\d{4}$/,
  });
  await expect(stamp).toBeVisible();
  await expect(page.getByText(/^1 \/ \d+ museota$/)).toBeVisible();

  await stamp.click();
  await expect(page).toHaveURL(/\/museums\//);

  assertPageClean();
});

test("without Web Share, Jaa passi copies the text and downloads the image", async ({
  page,
  context,
  assertPageClean,
  resetPageClean,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.addInitScript(() => {
    delete (Navigator.prototype as Partial<Navigator>).share;
    delete (Navigator.prototype as Partial<Navigator>).canShare;
  });
  await markIntervallumVisited(page, uniqueEmail("passport-share"));
  resetPageClean();

  await page.goto("/my/passport");
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: t.pages.my.passport.share }).click(),
  ]);
  expect(download.suggestedFilename()).toBe("museopassi.png");
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: t.pages.my.passport.shareCopied }),
  ).toBeVisible();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toMatch(
    /^Museopassi \d{4} 🏛️ 1\/\d+ museota\nPääkaupunkiseutu [▰▱]{5}\nhttps?:\/\/\S+$/,
  );

  assertPageClean();
});

async function markIntervallumVisited(page: Page, email: string) {
  await devSignIn(page, email, "/");
  await page
    .getByRole("link", { name: /Intervallum/ })
    .first()
    .click();
  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().includes("userExhibition.setStatus") &&
        response.request().method() === "POST",
    ),
    page
      .getByRole("button", { name: t.ui.status.visited, exact: true })
      .click(),
  ]);
}
