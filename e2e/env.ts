import { createHash } from "node:crypto";

// Each checkout (main or an agent worktree) gets its own block of ports, so
// parallel suites never share a server. E2E_BASE_PORT overrides it.
const derivedPort =
  8700 +
  (createHash("sha1").update(process.cwd()).digest().readUInt16BE(0) % 400) * 3;
export const APP_PORT = Number(process.env.E2E_BASE_PORT ?? derivedPort);
export const PROD_CHECK_PORT = APP_PORT + 1;
export const MAINTENANCE_PORT = APP_PORT + 2;

export const APP_BASE_URL = `http://127.0.0.1:${APP_PORT}`;
export const APP_LOG_PATH = "e2e/.tmp/app-server.log";

export const PROD_CHECK_BASE_URL = `http://127.0.0.1:${PROD_CHECK_PORT}`;

export const MAINTENANCE_BASE_URL = `http://127.0.0.1:${MAINTENANCE_PORT}`;
export const MAINTENANCE_PERSIST_DIR = ".wrangler/state-e2e-maintenance";
export const MAINTENANCE_LOG_PATH = "e2e/.tmp/maintenance-server.log";
