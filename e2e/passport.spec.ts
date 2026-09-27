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

  let releaseImage = () => {};
  const imageHeld = new Promise<void>((resolve) => (releaseImage = resolve));
  await page.route("**/my/passport/share.png", async (route) => {
    await imageHeld;
    await route.continue();
  });
  await page.goto("/my/passport");
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: t.pages.my.passport.share }).click();
  await expect(
    page.getByRole("button", { name: t.pages.my.passport.sharePreparing }),
  ).toBeDisabled();
  releaseImage();
  const download = await downloaded;
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

test("Jaa passi shares the image with the link inside the text", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const calls: unknown[] = [];
    (window as unknown as { shareCalls: unknown[] }).shareCalls = calls;
    Object.defineProperty(Navigator.prototype, "canShare", {
      configurable: true,
      value: () => true,
    });
    Object.defineProperty(Navigator.prototype, "share", {
      configurable: true,
      value: async (data: ShareData) => {
        calls.push({
          keys: Object.keys(data).sort(),
          text: data.text,
          files: data.files?.length ?? 0,
        });
      },
    });
  });
  await markIntervallumVisited(page, uniqueEmail("passport-native-share"));
  await page.goto("/my/passport");

  await page.getByRole("button", { name: t.pages.my.passport.share }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as unknown as { shareCalls: unknown[] }).shareCalls,
      ),
    )
    .toEqual([
      {
        keys: ["files", "text"],
        text: expect.stringContaining("https://kuraattori.emialis.com"),
        files: 1,
      },
    ]);
});
