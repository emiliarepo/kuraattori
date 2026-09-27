import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { afterEach, describe, expect, it, vi } from "vitest";

import * as schema from "~/server/db/schema";

process.env.AUTH_SECRET ??= "test-secret";
vi.mock("~/server/auth", () => ({ auth: vi.fn() }));
const { createCaller } = await import("~/server/api/root");
const client = createClient({ url: ":memory:" });
const db = drizzle(client, { schema });
await migrate(db, { migrationsFolder: "drizzle" });
const ctx = {
  db,
  session: null,
  headers: new Headers(),
} as unknown as Parameters<typeof createCaller>[0];

afterEach(async () => {
  await client.execute("delete from kuraattori_user_exhibition");
  await client.execute("delete from kuraattori_user");
  await client.execute("delete from kuraattori_exhibition_category");
  await client.execute("delete from kuraattori_exhibition");
  await client.execute("delete from kuraattori_category");
  await client.execute("delete from kuraattori_museum");
});

describe("exhibition API", () => {
  it("filters seeded SQLite exhibitions by region, phase, category and search", async () => {
    await db.insert(schema.museums).values({
      id: 1,
      source: "test",
      sourceId: "m1",
      name: "Ateneum",
      slug: "ateneum",
      city: "Helsinki",
      region: "Pääkaupunkiseutu",
    });
    await db.insert(schema.museums).values({
      id: 2,
      source: "test",
      sourceId: "m2",
      name: "Sara Hildén",
      slug: "sara",
      city: "Tampere",
      region: "Tampere",
    });
    await db.insert(schema.categories).values({
      id: 1,
      source: "test",
      sourceId: "c1",
      name: "Maalaus",
      slug: "maalaus",
    });
    await db.insert(schema.exhibitions).values([
      {
        id: 1,
        source: "test",
        sourceId: "e1",
        museumId: 1,
        slug: "helsinki-painting",
        titleFi: "Maalausta Helsingissä",
        startDate: "2026-01-01",
        endDate: "2026-12-31",
        sourcePayloadHash: "a",
      },
      {
        id: 2,
        source: "test",
        sourceId: "e2",
        museumId: 2,
        slug: "tampere-future",
        titleFi: "Tuleva",
        startDate: "2099-01-01",
        endDate: "2099-02-01",
        sourcePayloadHash: "b",
      },
    ]);
    await db
      .insert(schema.exhibitionCategories)
      .values({ exhibitionId: 1, categoryId: 1 });

    const result = await createCaller(ctx).exhibition.list({
      region: "Pääkaupunkiseutu",
      state: "current",
      categoryIds: [1],
      search: "maalausta",
    });
    expect(result.items.map((item) => item.slug)).toEqual([
      "helsinki-painting",
    ]);
    expect(result.items[0]?.museum.name).toBe("Ateneum");
    expect(result.nextCursor).toBeNull();
  });

  it("excludes exhibitions the signed-in user has hidden", async () => {
    await db.insert(schema.users).values({ id: "u1", email: "u1@example.com" });
    await db.insert(schema.museums).values({
      id: 1,
      source: "test",
      sourceId: "m1",
      name: "Ateneum",
      slug: "ateneum",
      city: "Helsinki",
      region: "Pääkaupunkiseutu",
    });
    await db.insert(schema.exhibitions).values(
      [1, 2].map((id) => ({
        id,
        source: "test",
        sourceId: `e${id}`,
        museumId: 1,
        slug: `e${id}`,
        titleFi: `Näyttely ${id}`,
        startDate: "2026-01-01",
        endDate: "2099-12-31",
        sourcePayloadHash: "x",
      })),
    );
    await db
      .insert(schema.userExhibitions)
      .values({ userId: "u1", exhibitionId: 1, status: "hidden" });

    const signedIn = {
      ...ctx,
      session: { user: { id: "u1" }, expires: "2099-01-01" },
    } as typeof ctx;
    const result = await createCaller(signedIn).exhibition.list({});
    expect(result.items.map((item) => item.slug)).toEqual(["e2"]);
  });

  it("rejects a protected procedure without a session", async () => {
    await expect(createCaller(ctx).profile.get()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  describe("new", () => {
    it("lists exhibitions opened within the last 30 days, newest first, excluding upcoming ones", async () => {
      await db.insert(schema.museums).values({
        id: 1,
        source: "test",
        sourceId: "m1",
        name: "Ateneum",
        slug: "ateneum",
        city: "Helsinki",
        region: "Pääkaupunkiseutu",
      });
      await db.insert(schema.exhibitions).values([
        {
          id: 1,
          source: "test",
          sourceId: "recent",
          museumId: 1,
          slug: "recent",
          titleFi: "Vasta avattu",
          startDate: "2026-09-20",
          endDate: "2026-12-31",
          sourcePayloadHash: "a",
        },
        {
          id: 2,
          source: "test",
          sourceId: "older",
          museumId: 1,
          slug: "older",
          titleFi: "Kauan sitten avattu",
          startDate: "2026-01-01",
          endDate: "2026-12-31",
          sourcePayloadHash: "b",
        },
        {
          id: 3,
          source: "test",
          sourceId: "upcoming",
          museumId: 1,
          slug: "upcoming",
          titleFi: "Tuleva",
          startDate: "2026-10-15",
          endDate: "2026-12-31",
          sourcePayloadHash: "c",
        },
        {
          id: 4,
          source: "test",
          sourceId: "newest",
          museumId: 1,
          slug: "newest",
          titleFi: "Tuorein",
          startDate: "2026-09-25",
          endDate: "2026-12-31",
          sourcePayloadHash: "d",
        },
      ]);

      const result = await createCaller(ctx).exhibition.new({});
      expect(result.map((item) => item.slug)).toEqual(["newest", "recent"]);
    });

    it("filters by region", async () => {
      await db.insert(schema.museums).values([
        {
          id: 1,
          source: "test",
          sourceId: "m1",
          name: "Ateneum",
          slug: "ateneum",
          city: "Helsinki",
          region: "Pääkaupunkiseutu",
        },
        {
          id: 2,
          source: "test",
          sourceId: "m2",
          name: "Sara Hildén",
          slug: "sara",
          city: "Tampere",
          region: "Tampere",
        },
      ]);
      await db.insert(schema.exhibitions).values([
        {
          id: 1,
          source: "test",
          sourceId: "helsinki",
          museumId: 1,
          slug: "helsinki-new",
          titleFi: "Helsinki",
          startDate: "2026-09-20",
          endDate: "2026-12-31",
          sourcePayloadHash: "a",
        },
        {
          id: 2,
          source: "test",
          sourceId: "tampere",
          museumId: 2,
          slug: "tampere-new",
          titleFi: "Tampere",
          startDate: "2026-09-20",
          endDate: "2026-12-31",
          sourcePayloadHash: "b",
        },
      ]);

      const result = await createCaller(ctx).exhibition.new({
        region: "Tampere",
      });
      expect(result.map((item) => item.slug)).toEqual(["tampere-new"]);
    });
  });
});
