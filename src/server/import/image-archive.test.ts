import { createClient } from "@libsql/client";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { describe, expect, it, vi } from "vitest";

import { type Db } from "~/server/db";
import * as schema from "~/server/db/schema";

import { archiveImages, archiveKey } from "./image-archive";

describe("archiveKey", () => {
  it("is exhibitions/<id>/<sha1 of the source URL>.webp", () => {
    expect(archiveKey(42, "https://museot.fi/a.jpg")).toBe(
      "exhibitions/42/059b152885e4949662e0e65a2d74e84f52b8106a.webp",
    );
  });
});

describe("archiveImages", () => {
  it("archives changed images, skips removed ones and retries failures next run", async () => {
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
    const base = {
      source: "test",
      museumId: 1,
      titleFi: "Näyttely",
      startDate: "2026-01-01",
      sourcePayloadHash: "a",
    };
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

    const stats = await archiveImages(db as unknown as Db, deps, 10);

    expect(stats).toEqual({
      withImage: 3,
      archived: 2,
      attempted: 2,
      failed: 1,
      pending: 1,
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

    const again = await archiveImages(db as unknown as Db, deps, 10);
    expect(again.attempted).toBe(1);
  });
});
