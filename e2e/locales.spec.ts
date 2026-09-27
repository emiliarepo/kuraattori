import { devSignIn, uniqueEmail } from "./dev-sign-in";
import { expect, test } from "./fixtures";
import { APP_BASE_URL } from "./env";

async function useLocaleCookie(
  context: import("@playwright/test").BrowserContext,
  locale: string,
) {
  await context.addCookies([
    { name: "kuraattori_locale", value: locale, url: APP_BASE_URL },
  ]);
}

test("in English, an exhibition without English text shows its Finnish title and description", async ({
  page,
  context,
  assertPageClean,
}) => {
  await useLocaleCookie(context, "en");
  await page.goto("/exhibitions?q=Intervallum");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await page
    .getByRole("link", { name: /Intervallum/ })
    .first()
    .click();

  const title = page.getByRole("heading", { level: 1 });
  await expect(title).toContainText("Intervallum – Näkymiä kiertokulkuihin");
  await expect(title).toHaveAttribute("lang", "fi");
  const description = page.locator("article p[lang='fi'].text-lg");
  await expect(description).not.toBeEmpty();
  await expect(page.locator("article")).not.toContainText("undefined");
  await expect(
    page.getByRole("link", { name: "Source on museot.fi" }),
  ).toBeVisible();
  assertPageClean();
});

test("in English, a translated exhibition shows its English description", async ({
  page,
  context,
  assertPageClean,
}) => {
  await useLocaleCookie(context, "en");
  await page.goto("/feed");
  await page
    .getByRole("link", { name: /Oliver Beer/ })
    .first()
    .click();
  await expect(page.getByText(/^Lullabies, traditional songs/)).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).not.toHaveAttribute(
    "lang",
    "fi",
  );
  assertPageClean();
});

test("the sign-in footer switches the language for an anonymous visitor", async ({
  page,
  assertPageClean,
}) => {
  await page.goto("/sign-in");
  await page.getByRole("radio", { name: "Svenska" }).check();
  await expect(page.locator("html")).toHaveAttribute("lang", "sv");
  await expect(
    page.getByRole("heading", { name: "Logga in", level: 1 }),
  ).toBeVisible();

  await page.reload();
  await expect(page.getByRole("radio", { name: "Svenska" })).toBeChecked();
  assertPageClean();
});

test("a signed-in user's language is saved on the account", async ({
  page,
  context,
  resetPageClean,
  assertPageClean,
}) => {
  await devSignIn(page, uniqueEmail("locale"), "/settings/account");
  resetPageClean();
  await page.getByRole("radio", { name: "English" }).check();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");

  await context.clearCookies({ name: "kuraattori_locale" });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(
    page.getByRole("navigation", { name: "Main navigation" }).first(),
  ).toBeVisible();
  assertPageClean();
});
