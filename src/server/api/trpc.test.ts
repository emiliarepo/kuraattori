import { afterEach, describe, expect, it, vi } from "vitest";

process.env.AUTH_SECRET ??= "test-secret";
vi.mock("~/server/auth", () => ({ auth: vi.fn() }));
const { createCaller } = await import("~/server/api/root");

function ctxWithFailingDb(
  error: Error,
  session: { user: { id: string } } | null = null,
) {
  return {
    db: {
      select: () => {
        throw error;
      },
    },
    session: session && { ...session, expires: "2099-01-01" },
    headers: new Headers(),
  } as unknown as Parameters<typeof createCaller>[0];
}

describe("procedure error logging", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("logs the procedure path, D1 error code and signed-in state, then rejects", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const ctx = ctxWithFailingDb(
      new Error("D1_ERROR: too many rows read: SQLITE_TOOBIG"),
      { user: { id: "user-1" } },
    );

    await expect(createCaller(ctx).meta.lastImportAt()).rejects.toThrow();

    expect(spy).toHaveBeenCalledWith(
      "[server-error]",
      expect.objectContaining({
        source: "trpc.meta.lastImportAt",
        userIdPresent: true,
        d1ErrorCode: "SQLITE_TOOBIG",
      }),
    );
  });

  it("reports no signed-in user and no D1 code for an unrelated, anonymous failure", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const ctx = ctxWithFailingDb(new Error("boom"));

    await expect(createCaller(ctx).meta.lastImportAt()).rejects.toThrow();

    expect(spy).toHaveBeenCalledWith(
      "[server-error]",
      expect.objectContaining({
        source: "trpc.meta.lastImportAt",
        userIdPresent: false,
        d1ErrorCode: null,
      }),
    );
  });
});
