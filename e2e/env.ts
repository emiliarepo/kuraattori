import { createHash } from "node:crypto";

// Each checkout (main or an agent worktree) gets its own port pair, so
// parallel suites never share a server. E2E_BASE_PORT overrides it.
const derivedPort =
  8700 +
  (createHash("sha1").update(process.cwd()).digest().readUInt16BE(0) % 400) * 2;
export const APP_PORT = Number(process.env.E2E_BASE_PORT ?? derivedPort);
export const PROD_CHECK_PORT = APP_PORT + 1;

export const APP_BASE_URL = `http://127.0.0.1:${APP_PORT}`;
export const APP_LOG_PATH = "e2e/.tmp/app-server.log";

export const PROD_CHECK_BASE_URL = `http://127.0.0.1:${PROD_CHECK_PORT}`;
