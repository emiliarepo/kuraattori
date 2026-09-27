import { test as base, expect } from "@playwright/test";

import { APP_LOG_PATH } from "./env";
import { checkReadBudget } from "./read-budget";

interface ConsoleTracker {
  consoleErrors: string[];
  pageErrors: string[];
  sinceMs: number;
}

/**
 * `assertPageClean` covers every page visited since the test started, or
 * since the last `resetPageClean()`: no browser console errors or uncaught
 * exceptions, and no D1 read-budget burst over issues/23's guard
 * (`src/server/db/read-budget.ts`). Call `assertPageClean` after each
 * navigation you want checked, or once at the end of a test; call
 * `resetPageClean` first to discard noise from setup that isn't the thing
 * under test (e.g. `devSignIn`'s known chunk-loading hiccup, see its
 * comment).
 */
export const test = base.extend<{
  consoleTracker: ConsoleTracker;
  assertPageClean: () => void;
  resetPageClean: () => void;
}>({
  consoleTracker: async ({ page }, use) => {
    const tracker: ConsoleTracker = {
      consoleErrors: [],
      pageErrors: [],
      sinceMs: Date.now(),
    };
    page.on("console", (message) => {
      if (message.type() === "error")
        tracker.consoleErrors.push(message.text());
    });
    page.on("pageerror", (error) => tracker.pageErrors.push(String(error)));
    await use(tracker);
  },
  assertPageClean: async ({ consoleTracker }, use) => {
    await use(() => {
      expect(consoleTracker.consoleErrors, "browser console errors").toEqual(
        [],
      );
      expect(consoleTracker.pageErrors, "uncaught page errors").toEqual([]);
      const budget = checkReadBudget(APP_LOG_PATH, consoleTracker.sinceMs);
      expect(
        budget.exceeded,
        `D1 read budget exceeded (${budget.maxRunningTotal} rows):\n${budget.offendingLines.join("\n")}`,
      ).toBe(false);
    });
  },
  resetPageClean: async ({ consoleTracker }, use) => {
    await use(() => {
      consoleTracker.consoleErrors = [];
      consoleTracker.pageErrors = [];
      consoleTracker.sinceMs = Date.now();
    });
  },
});

export { expect };
