import { expect, test } from "./fixtures";
import { devSignIn, uniqueEmail } from "./dev-sign-in";
import { t } from "../src/i18n/fi";

// Headless Chromium has no push service and reports notifications as denied,
// so the permission and the browser's subscription are faked; everything from
// the button to the stored row is real.
const FAKE_ENDPOINT = "https://push.example.test/e2e-subscription";

test("opt in to closing-soon notifications and back out", async ({
  page,
  resetPageClean,
  assertPageClean,
}) => {
  await page.addInitScript((endpoint) => {
    const key = "e2e-push-subscribed";
    Object.defineProperty(Notification, "permission", { get: () => "granted" });
    Notification.requestPermission = async () => "granted";
    const subscription = {
      endpoint,
      toJSON: () => ({
        endpoint,
        keys: { p256dh: "p256dh-key", auth: "auth" },
      }),
      unsubscribe: async () => {
        localStorage.removeItem(key);
        return true;
      },
    };
    PushManager.prototype.getSubscription = async () =>
      (localStorage.getItem(key)
        ? subscription
        : null) as unknown as PushSubscription | null;
    PushManager.prototype.subscribe = async () => {
      localStorage.setItem(key, "1");
      return subscription as unknown as PushSubscription;
    };
  }, FAKE_ENDPOINT);

  await devSignIn(page, uniqueEmail("push"), "/settings/calendar");
  resetPageClean();

  const enable = page.getByRole("button", { name: t.profile.push.enable });
  await expect(enable).toBeEnabled();
  await Promise.all([
    page.waitForResponse(
      (response) => response.url().includes("push.subscribe") && response.ok(),
    ),
    enable.click(),
  ]);
  await expect(page.getByText(t.profile.push.enabled)).toBeVisible();

  const exported = await (await page.request.get("/api/account/export")).json();
  expect(exported.pushSubscriptions).toEqual([
    expect.objectContaining({ endpoint: FAKE_ENDPOINT }),
  ]);

  await page.reload();
  await expect(page.getByText(t.profile.push.enabled)).toBeVisible();

  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().includes("push.unsubscribe") && response.ok(),
    ),
    page.getByRole("button", { name: t.profile.push.disable }).click(),
  ]);
  await expect(enable).toBeEnabled();
  const afterDisable = await (
    await page.request.get("/api/account/export")
  ).json();
  expect(afterDisable.pushSubscriptions).toEqual([]);

  await assertPageClean();
});
