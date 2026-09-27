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
});
