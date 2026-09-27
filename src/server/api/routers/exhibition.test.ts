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

  describe("grouping", () => {
    it("collapses the same exhibition at two venues into one item with both venues listed", async () => {
      await db.insert(schema.museums).values([
        {
          id: 1,
          source: "test",
          sourceId: "m1",
          name: "Oulun museo",
          slug: "oulun-museo",
          city: "Oulu",
        },
        {
          id: 2,
          source: "test",
          sourceId: "m2",
          name: "Tiima",
          slug: "tiima",
          city: "Oulu",
        },
      ]);
      await db.insert(schema.exhibitions).values([
        {
          id: 1,
          source: "test",
          sourceId: "e1",
          museumId: 1,
          slug: "metallikausi-oulu",
          titleFi: "Metallikausi",
          startDate: "2026-01-01",
          endDate: "2026-12-31",
          sourcePayloadHash: "a",
          exhibitionGroup: "metallikausi-group",
        },
        {
          id: 2,
          source: "test",
          sourceId: "e2",
          museumId: 2,
          slug: "metallikausi-tiima",
          titleFi: "Metallikausi",
          startDate: "2026-01-01",
          endDate: "2026-12-31",
          sourcePayloadHash: "b",
          exhibitionGroup: "metallikausi-group",
        },
      ]);

      const result = await createCaller(ctx).exhibition.list({});
      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.slug).toBe("metallikausi-oulu");
      expect(result.items[0]?.venues.map((v) => v.name)).toEqual([
        "Oulun museo",
        "Tiima",
      ]);
    });

    it("shows a status set on either group member on the merged item", async () => {
      await db
        .insert(schema.users)
        .values({ id: "u1", email: "u1@example.com" });
      await db.insert(schema.museums).values([
        {
          id: 1,
          source: "test",
          sourceId: "m1",
          name: "Oulun museo",
          slug: "oulun-museo",
          city: "Oulu",
        },
        {
          id: 2,
          source: "test",
          sourceId: "m2",
          name: "Tiima",
          slug: "tiima",
          city: "Oulu",
        },
      ]);
      await db.insert(schema.exhibitions).values([
        {
          id: 1,
          source: "test",
          sourceId: "e1",
          museumId: 1,
          slug: "metallikausi-oulu",
          titleFi: "Metallikausi",
          startDate: "2026-01-01",
          endDate: "2026-12-31",
          sourcePayloadHash: "a",
          exhibitionGroup: "metallikausi-group",
        },
        {
          id: 2,
          source: "test",
          sourceId: "e2",
          museumId: 2,
          slug: "metallikausi-tiima",
          titleFi: "Metallikausi",
          startDate: "2026-01-01",
          endDate: "2026-12-31",
          sourcePayloadHash: "b",
          exhibitionGroup: "metallikausi-group",
        },
      ]);
      await db
        .insert(schema.userExhibitions)
        .values({ userId: "u1", exhibitionId: 2, status: "interested" });

      const signedIn = {
        ...ctx,
        session: { user: { id: "u1" }, expires: "2099-01-01" },
      } as typeof ctx;
      const result = await createCaller(signedIn).exhibition.list({});
      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.status).toBe("interested");
    });

    it("hides the merged item when any group member is hidden", async () => {
      await db
        .insert(schema.users)
        .values({ id: "u1", email: "u1@example.com" });
      await db.insert(schema.museums).values([
        {
          id: 1,
          source: "test",
          sourceId: "m1",
          name: "Oulun museo",
          slug: "oulun-museo",
          city: "Oulu",
        },
        {
          id: 2,
          source: "test",
          sourceId: "m2",
          name: "Tiima",
          slug: "tiima",
          city: "Oulu",
        },
      ]);
      await db.insert(schema.exhibitions).values([
        {
          id: 1,
          source: "test",
          sourceId: "e1",
          museumId: 1,
          slug: "metallikausi-oulu",
          titleFi: "Metallikausi",
          startDate: "2026-01-01",
          endDate: "2026-12-31",
          sourcePayloadHash: "a",
          exhibitionGroup: "metallikausi-group",
        },
        {
          id: 2,
          source: "test",
          sourceId: "e2",
          museumId: 2,
          slug: "metallikausi-tiima",
          titleFi: "Metallikausi",
          startDate: "2026-01-01",
          endDate: "2026-12-31",
          sourcePayloadHash: "b",
          exhibitionGroup: "metallikausi-group",
        },
      ]);
      await db
        .insert(schema.userExhibitions)
        .values({ userId: "u1", exhibitionId: 2, status: "hidden" });

      const signedIn = {
        ...ctx,
        session: { user: { id: "u1" }, expires: "2099-01-01" },
      } as typeof ctx;
      const result = await createCaller(signedIn).exhibition.list({});
      expect(result.items).toHaveLength(0);
    });

    it("excludes kind='notice' listings from list and new", async () => {
      await db.insert(schema.museums).values({
        id: 1,
        source: "test",
        sourceId: "m1",
        name: "Heinolan taidemuseo",
        slug: "heinolan-taidemuseo",
        city: "Heinola",
      });
      await db.insert(schema.exhibitions).values({
        id: 1,
        source: "test",
        sourceId: "e1",
        museumId: 1,
        slug: "notice",
        titleFi: "suljettu näyttelyn vaihdon ajan",
        startDate: "2026-09-20",
        endDate: "2026-12-31",
        sourcePayloadHash: "a",
        kind: "notice",
      });

      const list = await createCaller(ctx).exhibition.list({});
      expect(list.items).toHaveLength(0);
      const upcoming = await createCaller(ctx).exhibition.new({});
      expect(upcoming).toHaveLength(0);
    });

    it("bySlug lists every venue in the group, however it was reached", async () => {
      await db.insert(schema.museums).values([
        {
          id: 1,
          source: "test",
          sourceId: "m1",
          name: "Oulun museo",
          slug: "oulun-museo",
          city: "Oulu",
        },
        {
          id: 2,
          source: "test",
          sourceId: "m2",
          name: "Tiima",
          slug: "tiima",
          city: "Oulu",
        },
      ]);
      await db.insert(schema.exhibitions).values([
        {
          id: 1,
          source: "test",
          sourceId: "e1",
          museumId: 1,
          slug: "metallikausi-oulu",
          titleFi: "Metallikausi",
          startDate: "2026-01-01",
          endDate: "2026-12-31",
          sourcePayloadHash: "a",
          exhibitionGroup: "metallikausi-group",
        },
        {
          id: 2,
          source: "test",
          sourceId: "e2",
          museumId: 2,
          slug: "metallikausi-tiima",
          titleFi: "Metallikausi",
          startDate: "2026-01-01",
          endDate: "2026-12-31",
          sourcePayloadHash: "b",
          exhibitionGroup: "metallikausi-group",
        },
      ]);

      const viaTiima = await createCaller(ctx).exhibition.bySlug({
        slug: "metallikausi-tiima",
      });
      expect(viaTiima?.slug).toBe("metallikausi-oulu");
      expect(viaTiima?.venues.map((v) => v.name)).toEqual([
        "Oulun museo",
        "Tiima",
      ]);
    });
  });

  it("ranks similar exhibitions, collapses groups, and excludes self, hidden, ended, and notices", async () => {
    await db.insert(schema.users).values({ id: "u1", email: "u1@example.com" });
    await db.insert(schema.museums).values([
      {
        id: 1,
        source: "test",
        sourceId: "m1",
        name: "Museum 1",
        slug: "m1",
        region: "Home",
      },
      {
        id: 2,
        source: "test",
        sourceId: "m2",
        name: "Museum 2",
        slug: "m2",
        region: "Away",
      },
      {
        id: 3,
        source: "test",
        sourceId: "m3",
        name: "Museum 3",
        slug: "m3",
        region: "Home",
      },
      {
        id: 4,
        source: "test",
        sourceId: "m4",
        name: "Museum 4",
        slug: "m4",
        region: "Home",
      },
      {
        id: 5,
        source: "test",
        sourceId: "m5",
        name: "Museum 5",
        slug: "m5",
        region: "Away",
      },
    ]);
    await db.insert(schema.categories).values([
      { id: 1, source: "test", sourceId: "c1", name: "One", slug: "one" },
      { id: 2, source: "test", sourceId: "c2", name: "Two", slug: "two" },
    ]);
    await db.insert(schema.exhibitions).values([
      {
        id: 1,
        source: "test",
        sourceId: "e1",
        museumId: 1,
        slug: "source",
        titleFi: "Source",
        startDate: "2026-01-01",
        endDate: "2026-12-31",
        sourcePayloadHash: "a",
        exhibitionGroup: "source-group",
      },
      {
        id: 2,
        source: "test",
        sourceId: "e2",
        museumId: 2,
        slug: "shared-category",
        titleFi: "Shared category",
        startDate: "2026-01-01",
        endDate: "2026-10-20",
        sourcePayloadHash: "b",
      },
      {
        id: 3,
        source: "test",
        sourceId: "e3",
        museumId: 3,
        slug: "shared-region",
        titleFi: "Shared region",
        startDate: "2026-01-01",
        endDate: "2026-10-31",
        sourcePayloadHash: "c",
      },
      {
        id: 4,
        source: "test",
        sourceId: "e4",
        museumId: 1,
        slug: "same-museum",
        titleFi: "Same museum",
        startDate: "2026-01-01",
        endDate: "2026-11-01",
        sourcePayloadHash: "d",
      },
      {
        id: 5,
        source: "test",
        sourceId: "e5",
        museumId: 4,
        slug: "tie-earlier",
        titleFi: "Tie earlier",
        startDate: "2026-01-01",
        endDate: "2026-09-28",
        sourcePayloadHash: "e",
      },
      {
        id: 6,
        source: "test",
        sourceId: "e6",
        museumId: 5,
        slug: "source-sibling",
        titleFi: "Source sibling",
        startDate: "2026-01-01",
        endDate: "2026-10-01",
        sourcePayloadHash: "f",
        exhibitionGroup: "source-group",
      },
      {
        id: 7,
        source: "test",
        sourceId: "e7",
        museumId: 2,
        slug: "ended",
        titleFi: "Ended",
        startDate: "2026-01-01",
        endDate: "2026-09-26",
        sourcePayloadHash: "g",
      },
      {
        id: 8,
        source: "test",
        sourceId: "e8",
        museumId: 2,
        slug: "notice",
        titleFi: "Notice",
        startDate: "2026-01-01",
        endDate: "2026-11-01",
        sourcePayloadHash: "h",
        kind: "notice",
      },
      {
        id: 9,
        source: "test",
        sourceId: "e9",
        museumId: 2,
        slug: "hidden",
        titleFi: "Hidden",
        startDate: "2026-01-01",
        endDate: "2026-11-01",
        sourcePayloadHash: "i",
      },
      {
        id: 10,
        source: "test",
        sourceId: "e10",
        museumId: 3,
        slug: "group-member",
        titleFi: "Group member",
        startDate: "2026-01-01",
        endDate: "2026-11-01",
        sourcePayloadHash: "j",
        exhibitionGroup: "candidate-group",
      },
      {
        id: 11,
        source: "test",
        sourceId: "e11",
        museumId: 4,
        slug: "group-canonical",
        titleFi: "Group canonical",
        startDate: "2026-01-01",
        endDate: "2026-11-01",
        sourcePayloadHash: "k",
        exhibitionGroup: "candidate-group",
      },
    ]);
    await db.insert(schema.exhibitionCategories).values([
      { exhibitionId: 1, categoryId: 1 },
      { exhibitionId: 1, categoryId: 2 },
      { exhibitionId: 2, categoryId: 1 },
      { exhibitionId: 3, categoryId: 1 },
      { exhibitionId: 5, categoryId: 1 },
      { exhibitionId: 6, categoryId: 1 },
    ]);
    await db
      .insert(schema.userExhibitions)
      .values({ userId: "u1", exhibitionId: 9, status: "hidden" });

    const signedIn = {
      ...ctx,
      session: { user: { id: "u1" }, expires: "2099-01-01" },
    } as typeof ctx;
    const result = await createCaller(signedIn).exhibition.similar({
      slug: "source",
    });
    expect(result.map((item) => item.slug)).toEqual([
      "tie-earlier",
      "shared-region",
      "shared-category",
      "same-museum",
      "group-member",
    ]);
    expect(result).toHaveLength(5);
  });
});
