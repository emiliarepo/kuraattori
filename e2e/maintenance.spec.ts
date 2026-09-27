import { readFileSync } from "node:fs";
import { join } from "node:path";

import { expect, test } from "@playwright/test";
import { getPlatformProxy } from "wrangler";

import { MAINTENANCE_LOG_PATH, MAINTENANCE_PERSIST_DIR } from "./env";

/**
 * Writes straight to the same local KV the `maintenance-server` webServer
 * reads from (see playwright.config.ts) — a dedicated server and persist
 * dir, so flipping the flag here can't 503 the "app" project's shared
 * server mid-suite.
 */
async function setMaintenanceFlag(expiresInMs: number): Promise<void> {
  const proxy = await getPlatformProxy<CloudflareEnv>({
    persist: { path: join(MAINTENANCE_PERSIST_DIR, "v3") },
  });
  try {
    await proxy.env.CACHE.put(
      "maintenance",
      JSON.stringify({
        reason: "e2e: maintenance.spec.ts",
        expiresAt: new Date(Date.now() + expiresInMs).toISOString(),
      }),
    );
  } finally {
    await proxy.dispose();
  }
}

/** Lines appended to the server log after `sinceBytes` (see scripts/e2e-server.ts). */
function linesSince(sinceBytes: number): string[] {
  const content = readFileSync(MAINTENANCE_LOG_PATH, "utf-8");
  return content.slice(sinceBytes).split("\n").filter(Boolean);
}

function logSize(): number {
  try {
    return readFileSync(MAINTENANCE_LOG_PATH, "utf-8").length;
  } catch {
    return 0;
  }
}

test("serves the Finnish 503 page and never reaches D1 while the maintenance flag is set", async ({
  request,
}) => {
  await setMaintenanceFlag(5 * 60_000);
  const sinceBytes = logSize();

  for (const path of [
    "/",
    "/api/auth/providers",
    "/api/calendar/some-token.ics",
  ]) {
    const response = await request.get(path, { maxRedirects: 0 });
    expect(response.status(), path).toBe(503);
    expect(response.headers()["retry-after"], path).toBeTruthy();
    const body = await response.text();
    expect(body, path).toContain("Kuraattori on hetken tauolla");
  }

  const lines = linesSince(sinceBytes);
  const d1Lines = lines.filter((line) => line.includes("[d1-budget]"));
  expect(
    d1Lines,
    "no D1 statement should run while the maintenance flag is set",
  ).toEqual([]);
});
