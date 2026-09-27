import { createClient } from "@libsql/client";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { describe, expect, it, vi } from "vitest";

import { type Db } from "~/server/db";
import * as schema from "~/server/db/schema";

import {
  archiveImages,
  archiveKey,
  createImageDownloader,
  DEFAULT_IMAGE_ARCHIVE_LIMITS,
  parseRetryAfter,
  ThrottledError,
} from "./image-archive";

describe("archiveKey", () => {
  it("is exhibitions/<id>/<sha1 of the source URL>.webp", () => {
    expect(archiveKey(42, "https://museot.fi/a.jpg")).toBe(
      "exhibitions/42/059b152885e4949662e0e65a2d74e84f52b8106a.webp",
    );
  });
});

const noWaits = { ...DEFAULT_IMAGE_ARCHIVE_LIMITS, intervalMs: 0 };

const base = {
  source: "test",
  museumId: 1,
  titleFi: "Näyttely",
  startDate: "2026-01-01",
  sourcePayloadHash: "a",
};

async function createDb() {
  const client = createClient({ url: ":memory:" });
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: "drizzle" });
  await db.insert(schema.museums).values({
    id: 1,
    source: "test",
    sourceId: "m1",
    name: "Ateneum",
    slug: "ateneum",
  });
  return db;
}

async function seedImages(db: Awaited<ReturnType<typeof createDb>>, n: number) {
  await db.insert(schema.exhibitions).values(
    Array.from({ length: n }, (_, i) => ({
      ...base,
      id: i + 1,
      sourceId: `e${i + 1}`,
      slug: `e${i + 1}`,
      imageUrl: `https://x/${i + 1}`,
    })),
  );
}

/** A clock that only moves when the archiver sleeps. */
function fakeClock() {
  let t = 0;
  const sleeps: number[] = [];
  return {
    sleeps,
    now: () => t,
    sleep: async (ms: number) => {
      sleeps.push(ms);
      t += ms;
    },
  };
}

const resize = async (body: Uint8Array) => ({ body, width: 1, height: 1 });

describe("archiveImages", () => {
  it("archives changed images, skips removed ones and retries failures next run", async () => {
    const db = await createDb();
    await db.insert(schema.exhibitions).values([
      { ...base, id: 1, sourceId: "e1", slug: "e1", imageUrl: "https://x/1" },
      {
        ...base,
        id: 2,
        sourceId: "e2",
        slug: "e2",
        imageUrl: "https://x/2",
        imageArchiveKey: archiveKey(2, "https://x/2"),
      },
      {
        ...base,
        id: 3,
        sourceId: "e3",
        slug: "e3",
        imageUrl: "https://x/3",
        imageArchiveRemoved: true,
      },
      { ...base, id: 4, sourceId: "e4", slug: "e4", imageUrl: "https://x/4" },
    ]);

    const put = vi.fn(() => Promise.resolve());
    const deps = {
      download: async (url: string) => {
        if (url.endsWith("4")) throw new Error("404");
        return new Uint8Array([1]);
      },
      resize: async (body: Uint8Array) => ({ body, width: 1200, height: 800 }),
      put,
    };
    vi.spyOn(console, "warn").mockImplementation(() => undefined);

    const stats = await archiveImages(db as unknown as Db, deps, noWaits);

    expect(stats).toMatchObject({
      withImage: 3,
      archived: 2,
      archivedThisRun: 1,
      attempted: 2,
      failed: 1,
      throttled: 0,
      remaining: 1,
      stoppedBy: "done",
    });
    expect(put).toHaveBeenCalledOnce();
    expect(put).toHaveBeenCalledWith(
      archiveKey(1, "https://x/1"),
      new Uint8Array([1]),
    );
    const [row] = await db
      .select()
      .from(schema.exhibitions)
      .where(eq(schema.exhibitions.id, 1));
    expect(row).toMatchObject({
      imageArchiveKey: archiveKey(1, "https://x/1"),
      imageWidth: 1200,
      imageHeight: 800,
    });

    const again = await archiveImages(db as unknown as Db, deps, noWaits);
    expect(again.attempted).toBe(1);
  });
});

describe("archiveImages limits", () => {
  it("takes the oldest exhibitions first and stops at the per-run cap", async () => {
    const db = await createDb();
    await seedImages(db, 5);
    const downloaded: string[] = [];
    const stats = await archiveImages(
      db as unknown as Db,
      {
        download: async (url) => {
          downloaded.push(url);
          return new Uint8Array([1]);
        },
        resize,
        put: async () => undefined,
        ...fakeClock(),
      },
      { ...DEFAULT_IMAGE_ARCHIVE_LIMITS, maxDownloads: 2 },
    );
    expect(downloaded).toEqual(["https://x/1", "https://x/2"]);
    expect(stats).toMatchObject({
      archivedThisRun: 2,
      remaining: 3,
      stoppedBy: "cap",
    });
  });

  it("paces downloads and starts none after the wall-clock budget", async () => {
    const db = await createDb();
    await seedImages(db, 10);
    const clock = fakeClock();
    const stats = await archiveImages(
      db as unknown as Db,
      {
        download: async () => new Uint8Array([1]),
        resize,
        put: async () => undefined,
        ...clock,
      },
      { ...DEFAULT_IMAGE_ARCHIVE_LIMITS, intervalMs: 550, budgetMs: 2_000 },
    );
    expect(clock.sleeps).toEqual([550, 550, 550]);
    expect(stats).toMatchObject({ attempted: 4, stoppedBy: "budget" });
  });

  it("backs off exponentially, honours Retry-After and stops after consecutive throttles", async () => {
    const db = await createDb();
    await seedImages(db, 10);
    const clock = fakeClock();
    const responses = [
      () => new Uint8Array([1]),
      () => {
        throw new ThrottledError("connection reset", undefined);
      },
      () => new Uint8Array([1]),
      () => {
        throw new ThrottledError("429", 30_000);
      },
      () => {
        throw new ThrottledError("connection reset", undefined);
      },
      () => {
        throw new ThrottledError("503", undefined);
      },
    ];
    let call = 0;
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const stats = await archiveImages(
      db as unknown as Db,
      {
        download: async () => responses[call++]!(),
        resize,
        put: async () => undefined,
        ...clock,
      },
      {
        ...DEFAULT_IMAGE_ARCHIVE_LIMITS,
        intervalMs: 500,
        backoffBaseMs: 1_000,
      },
    );
    // 500 pace; reset → 1 s; success resets the streak; 429 asks for 30 s
    // (above 1 s); the next reset doubles to 2 s; the third throttle stops.
    expect(clock.sleeps).toEqual([500, 1_000, 500, 30_000, 2_000]);
    expect(call).toBe(6);
    expect(stats).toMatchObject({
      archivedThisRun: 2,
      throttled: 4,
      failed: 0,
      remaining: 8,
      stoppedBy: "throttled",
    });
  });

  it("stops rather than wait out a Retry-After longer than the max backoff", async () => {
    const db = await createDb();
    await seedImages(db, 3);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const download = vi.fn(async () => {
      throw new ThrottledError("429", 3_600_000);
    });
    const stats = await archiveImages(
      db as unknown as Db,
      { download, resize, put: async () => undefined, ...fakeClock() },
      noWaits,
    );
    expect(download).toHaveBeenCalledOnce();
    expect(stats.stoppedBy).toBe("throttled");
  });
});

describe("createImageDownloader", () => {
  const download = (fetch: typeof globalThis.fetch) =>
    createImageDownloader({ fetch, userAgent: "test", timeoutMs: 1_000 });

  it("turns 429 with Retry-After into a throttle", async () => {
    const error = await download(
      async () =>
        new Response("", { status: 429, headers: { "Retry-After": "12" } }),
    )("https://x/1").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ThrottledError);
    expect((error as ThrottledError).retryAfterMs).toBe(12_000);
  });

  it("turns a closed socket into a throttle", async () => {
    const socketError = Object.assign(new Error("other side closed"), {
      name: "SocketError",
      code: "UND_ERR_SOCKET",
    });
    const error = await download(async () => {
      throw new TypeError("fetch failed", { cause: socketError });
    })("https://x/1").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ThrottledError);
  });

  it("treats 404 as an ordinary failure and passes the timeout signal", async () => {
    let signal: AbortSignal | null | undefined;
    const error = await download(async (_url, init) => {
      signal = init?.signal;
      return new Response("", { status: 404 });
    })("https://x/1").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(Error);
    expect(error).not.toBeInstanceOf(ThrottledError);
    expect(signal).toBeInstanceOf(AbortSignal);
  });
});

describe("parseRetryAfter", () => {
  it("reads seconds and HTTP dates", () => {
    expect(parseRetryAfter("5", 0)).toBe(5_000);
    expect(parseRetryAfter("Thu, 01 Jan 1970 00:01:00 GMT", 30_000)).toBe(
      30_000,
    );
    expect(parseRetryAfter(null, 0)).toBeUndefined();
  });
});
