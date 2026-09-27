import { APP_PORT } from "../env";

// Its own port block above e2e/env.ts's 8700–9899 range, so the visual
// server never collides with any checkout's functional suite.
export const VISUAL_PORT = APP_PORT + 1200;
export const VISUAL_BASE_URL = `http://127.0.0.1:${VISUAL_PORT}`;
export const VISUAL_PERSIST_DIR = ".wrangler/state-visual";
export const VISUAL_STORAGE_STATE = "e2e/.tmp/visual-user.json";

/** Sunday noon in Helsinki: inside the seeded fixtures' ends-today, ending-soon and upcoming windows. */
export const FROZEN_NOW = "2026-09-27T09:00:00.000Z";
export const FROZEN_TODAY = "2026-09-27";
export const VISUAL_USER_EMAIL = "visual@e2e.kuraattori.local";
