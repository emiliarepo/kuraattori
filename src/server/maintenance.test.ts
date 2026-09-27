import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getCloudflareContext } from "@opennextjs/cloudflare";

import {
  buildMaintenanceResponse,
  getMaintenanceFlag,
  isExpired,
  resetMaintenanceFlagCache,
  type MaintenanceFlag,
} from "./maintenance";

vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: vi.fn(),
}));

const mockedContext = vi.mocked(getCloudflareContext);

function withKv(get: (key: string, type: "json") => Promise<unknown>) {
  mockedContext.mockResolvedValue({
    env: { CACHE: { get } },
  } as never);
}

describe("isExpired", () => {
  it("is false before the expiry time and true after", () => {
    const flag: MaintenanceFlag = {
      reason: "budget",
      expiresAt: "2026-09-28T00:00:00.000Z",
    };
    expect(isExpired(flag, new Date("2026-09-27T23:59:59.000Z"))).toBe(false);
    expect(isExpired(flag, new Date("2026-09-28T00:00:00.000Z"))).toBe(true);
    expect(isExpired(flag, new Date("2026-09-28T00:00:01.000Z"))).toBe(true);
  });
});

describe("getMaintenanceFlag", () => {
  beforeEach(() => {
    resetMaintenanceFlagCache();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-27T10:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    mockedContext.mockReset();
  });

  it("returns null when no flag is set", async () => {
    const get = vi.fn().mockResolvedValue(null);
    withKv(get);
    await expect(getMaintenanceFlag()).resolves.toBeNull();
  });

  it("returns the flag while it is active", async () => {
    const flag: MaintenanceFlag = {
      reason: "worker requests over budget",
      expiresAt: "2026-09-28T00:00:00.000Z",
    };
    const get = vi.fn().mockResolvedValue(flag);
    withKv(get);
    await expect(getMaintenanceFlag()).resolves.toEqual(flag);
  });

  it("treats an expired flag as inactive", async () => {
    const flag: MaintenanceFlag = {
      reason: "stale",
      expiresAt: "2026-09-27T09:00:00.000Z",
    };
    const get = vi.fn().mockResolvedValue(flag);
    withKv(get);
    await expect(getMaintenanceFlag()).resolves.toBeNull();
  });

  it("reads KV at most once per isolate per 60 seconds", async () => {
    const get = vi.fn().mockResolvedValue(null);
    withKv(get);

    await getMaintenanceFlag();
    await getMaintenanceFlag();
    vi.advanceTimersByTime(59_000);
    await getMaintenanceFlag();
    expect(get).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(2_000);
    await getMaintenanceFlag();
    expect(get).toHaveBeenCalledTimes(2);
  });

  it("degrades to no maintenance flag when the CACHE binding is absent", async () => {
    mockedContext.mockResolvedValue({ env: {} } as never);
    await expect(getMaintenanceFlag()).resolves.toBeNull();
  });
});

describe("buildMaintenanceResponse", () => {
  it("serves 503 with a Retry-After and the Finnish message, without a KV read", async () => {
    const flag: MaintenanceFlag = {
      reason: "d1 rows read over budget",
      expiresAt: new Date(Date.now() + 5 * 60_000).toISOString(),
    };
    const response = buildMaintenanceResponse(flag);
    expect(response.status).toBe(503);
    expect(Number(response.headers.get("Retry-After"))).toBeGreaterThan(0);
    const body = await response.text();
    expect(body).toContain("Kuraattori on hetken tauolla");
    expect(body).toContain("Palaamme pian.");
  });

  it("floors Retry-After at 60 seconds even for a near-expired flag", () => {
    const flag: MaintenanceFlag = {
      reason: "near expiry",
      expiresAt: new Date(Date.now() + 1000).toISOString(),
    };
    const response = buildMaintenanceResponse(flag);
    expect(Number(response.headers.get("Retry-After"))).toBeGreaterThanOrEqual(
      60,
    );
  });
});
