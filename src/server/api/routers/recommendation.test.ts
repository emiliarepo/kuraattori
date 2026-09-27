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
await db
  .insert(schema.users)
  .values({ id: "user-1", email: "user-1@example.com" });
const userId = "user-1";
const ctx = {
  db,
  session: { user: { id: userId }, expires: "2099-01-01" },
  headers: new Headers(),
} as unknown as Parameters<typeof createCaller>[0];

afterEach(async () => {
  await client.execute("delete from kuraattori_user_exhibition");
  await client.execute("delete from kuraattori_user_followed_museum");
  await client.execute("delete from kuraattori_user_interest");
  await client.execute("delete from kuraattori_exhibition_category");
  await client.execute("delete from kuraattori_exhibition");
  await client.execute("delete from kuraattori_museum");
  await client.execute("delete from kuraattori_category");
});

describe("recommendation.forYou", () => {
  it("ranks a followed museum's exhibition above an equally-matching one elsewhere, with a 'Seuraat' reason", async () => {
    await db.insert(schema.museums).values([
      {
        id: 1,
        source: "test",
        sourceId: "m1",
        name: "Kiasma",
        slug: "kiasma",
      },
      {
        id: 2,
        source: "test",
        sourceId: "m2",
        name: "Ateneum",
        slug: "ateneum",
      },
    ]);
    await db.insert(schema.categories).values({
      id: 1,
      source: "test",
      sourceId: "c1",
      name: "Nykytaide",
      slug: "nykytaide",
    });
    await db.insert(schema.exhibitions).values([
      {
        id: 1,
        source: "test",
        sourceId: "e1",
        museumId: 1,
        slug: "followed-museum",
        titleFi: "Followed museum's exhibition",
        startDate: "2026-01-01",
        endDate: "2026-12-01",
        sourcePayloadHash: "a",
      },
      {
        id: 2,
        source: "test",
        sourceId: "e2",
        museumId: 2,
        slug: "other-museum",
        titleFi: "Other museum's exhibition",
        startDate: "2026-01-01",
        endDate: "2026-12-01",
        sourcePayloadHash: "b",
      },
    ]);
    await db.insert(schema.exhibitionCategories).values([
      { exhibitionId: 1, categoryId: 1 },
      { exhibitionId: 2, categoryId: 1 },
    ]);
    await db
      .insert(schema.userInterests)
      .values({ userId, categoryId: 1, weight: 1 });
    await db.insert(schema.userFollowedMuseums).values({ userId, museumId: 1 });

    const result = await createCaller(ctx).recommendation.forYou();
    expect(result.map((item) => item.exhibition.slug)).toEqual([
      "followed-museum",
      "other-museum",
    ]);
    expect(result[0]?.reasons).toContain("Seuraat: Kiasma");
    expect(result[0]!.score).toBeGreaterThan(result[1]!.score);
  });

  it("ranks an exhibition like the user's 👍 visits above an equal match, with a 'Pidit' reason", async () => {
    await db.insert(schema.museums).values([
      { id: 1, source: "test", sourceId: "m1", name: "Kiasma", slug: "kiasma" },
      {
        id: 2,
        source: "test",
        sourceId: "m2",
        name: "Ateneum",
        slug: "ateneum",
      },
    ]);
    await db.insert(schema.categories).values([
      {
        id: 1,
        source: "test",
        sourceId: "c1",
        name: "Nykytaide",
        slug: "nykytaide",
      },
      {
        id: 2,
        source: "test",
        sourceId: "c2",
        name: "Valokuva",
        slug: "valokuva",
      },
    ]);
    const exhibition = (id: number, museumId: number) => ({
      id,
      source: "test",
      sourceId: `e${id}`,
      museumId,
      slug: `e${id}`,
      titleFi: `Exhibition ${id}`,
      startDate: "2026-01-01",
      endDate: "2026-12-01",
      sourcePayloadHash: `${id}`,
    });
    await db
      .insert(schema.exhibitions)
      .values([
        exhibition(1, 1),
        exhibition(2, 1),
        exhibition(3, 2),
        exhibition(4, 2),
      ]);
    await db.insert(schema.exhibitionCategories).values([
      { exhibitionId: 1, categoryId: 1 },
      { exhibitionId: 2, categoryId: 1 },
      { exhibitionId: 3, categoryId: 1 },
      { exhibitionId: 4, categoryId: 2 },
    ]);
    await db.insert(schema.userInterests).values([
      { userId, categoryId: 1, weight: 1 },
      { userId, categoryId: 2, weight: 1 },
    ]);
    await db.insert(schema.userExhibitions).values([
      {
        userId,
        exhibitionId: 1,
        status: "visited",
        visitedAt: new Date(),
        rating: "up",
      },
      {
        userId,
        exhibitionId: 2,
        status: "visited",
        visitedAt: new Date(),
        rating: "up",
      },
    ]);

    const result = await createCaller(ctx).recommendation.forYou();
    expect(result.map((item) => item.exhibition.slug)).toEqual(["e3", "e4"]);
    expect(result[0]?.reasons).toContain("Pidit samankaltaisista");
    expect(result[1]?.reasons).not.toContain("Pidit samankaltaisista");
  });
});
