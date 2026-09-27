import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import { test as setup } from "@playwright/test";

import { devSignIn } from "../dev-sign-in";
import { isolatePage } from "./capture";
import { VISUAL_STORAGE_STATE, VISUAL_USER_EMAIL } from "./env";

/** Signs in as the user `scripts/visual-seed-user.ts` wrote into D1. */
setup("sign in the visual user", async ({ page, context }) => {
  await isolatePage(page);
  await devSignIn(page, VISUAL_USER_EMAIL, "/");

  // The server clock is frozen, so the session cookie's absolute expiry would
  // eventually lie in the real past; a session cookie never expires.
  const state = await context.storageState();
  state.cookies = state.cookies.map((cookie) => ({ ...cookie, expires: -1 }));
  mkdirSync(dirname(VISUAL_STORAGE_STATE), { recursive: true });
  writeFileSync(VISUAL_STORAGE_STATE, JSON.stringify(state, null, 2));
});
