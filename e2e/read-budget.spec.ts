import { APP_LOG_PATH } from "./env";
import { expect, test } from "./fixtures";
import { checkReadBudget, linesSince } from "./read-budget";

/** `scripts/e2e-server.ts` appends server output asynchronously; give it time to land before reading the log. */
const flushServerLog = () =>
  new Promise((resolve) => setTimeout(resolve, 1000));

const SITEMAP_QUERY = `select "id", "slug", "updatedAt", "exhibitionGroup" from "kuraattori_exhibition"`;

test("the sitemap stays under the read budget and is served from KV after the first hit", async ({
  request,
}) => {
  const firstSince = Date.now();
  const first = await request.get("/sitemap.xml");
  expect(first.ok()).toBe(true);
  expect(await first.text()).toContain("/exhibitions/");
  await flushServerLog();
  expect(checkReadBudget(APP_LOG_PATH, firstSince).exceeded).toBe(false);

  const secondSince = Date.now();
  const second = await request.get("/sitemap.xml");
  expect(second.ok()).toBe(true);
  await flushServerLog();
  expect(
    linesSince(APP_LOG_PATH, secondSince).filter((line) =>
      line.includes(SITEMAP_QUERY),
    ),
  ).toEqual([]);
});

test("a deep browse page stays under the read budget", async ({
  page,
  assertPageClean,
}) => {
  await page.goto("/exhibitions?page=20");
  await expect(page.getByRole("main").locator("ul > li").first()).toBeVisible();
  assertPageClean();
});
