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
  await client.execute("delete from kuraattori_user_followed_museum");
  await client.execute("delete from kuraattori_user_exhibition");
  await client.execute("delete from kuraattori_exhibition");
  await client.execute("delete from kuraattori_museum");
});

describe("museum.follow / unfollow", () => {
  it("is idempotent in both directions", async () => {
    await db.insert(schema.museums).values({
      id: 1,
      source: "test",
      sourceId: "m1",
      name: "Ateneum",
      slug: "ateneum",
    });
    const caller = createCaller(ctx);

    await caller.museum.follow({ museumId: 1 });
    await caller.museum.follow({ museumId: 1 });
    expect((await caller.museum.followed()).map((m) => m.id)).toEqual([1]);

    await caller.museum.unfollow({ museumId: 1 });
    await caller.museum.unfollow({ museumId: 1 });
    expect(await caller.museum.followed()).toEqual([]);
  });

  it("rejects following a museum that doesn't exist", async () => {
    await expect(
      createCaller(ctx).museum.follow({ museumId: 999 }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("museum.followedExhibitions", () => {
  it("returns only current/upcoming exhibitions at followed museums, one per group, soonest-ending first, excluding hidden and notices", async () => {
    await db.insert(schema.museums).values([
      {
        id: 1,
        source: "test",
        sourceId: "m1",
        name: "Followed",
        slug: "followed",
      },
      { id: 2, source: "test", sourceId: "m2", name: "Other", slug: "other" },
      {
        id: 3,
        source: "test",
        sourceId: "m3",
        name: "Followed sibling venue",
        slug: "followed-sibling",
      },
    ]);
    await db.insert(schema.exhibitions).values([
      {
        id: 1,
        source: "test",
        sourceId: "e1",
        museumId: 1,
        slug: "ends-later",
        titleFi: "Ends later",
        startDate: "2026-01-01",
        endDate: "2026-12-01",
        sourcePayloadHash: "a",
      },
      {
        id: 2,
        source: "test",
        sourceId: "e2",
        museumId: 1,
        slug: "ends-sooner",
        titleFi: "Ends sooner",
        startDate: "2026-01-01",
        endDate: "2026-10-01",
        sourcePayloadHash: "b",
      },
      {
        id: 3,
        source: "test",
        sourceId: "e3",
        museumId: 2,
        slug: "not-followed",
        titleFi: "Not followed",
        startDate: "2026-01-01",
        endDate: "2026-10-05",
        sourcePayloadHash: "c",
      },
      {
        id: 4,
        source: "test",
        sourceId: "e4",
        museumId: 1,
        slug: "hidden",
        titleFi: "Hidden",
        startDate: "2026-01-01",
        endDate: "2026-10-10",
        sourcePayloadHash: "d",
      },
      {
        id: 5,
        source: "test",
        sourceId: "e5",
        museumId: 1,
        slug: "notice",
        titleFi: "Notice",
        startDate: "2026-01-01",
        endDate: "2026-10-15",
        sourcePayloadHash: "e",
        kind: "notice",
      },
      {
        id: 6,
        source: "test",
        sourceId: "e6",
        museumId: 1,
        slug: "ended",
        titleFi: "Ended",
        startDate: "2026-01-01",
        endDate: "2026-01-02",
        sourcePayloadHash: "f",
      },
      {
        id: 7,
        source: "test",
        sourceId: "e7",
        museumId: 1,
        slug: "touring-followed",
        titleFi: "Touring",
        startDate: "2026-01-01",
        endDate: "2026-11-01",
        sourcePayloadHash: "g",
        exhibitionGroup: "touring",
      },
      {
        id: 8,
        source: "test",
        sourceId: "e8",
        museumId: 3,
        slug: "touring-other-venue",
        titleFi: "Touring",
        startDate: "2026-01-01",
        endDate: "2026-11-01",
        sourcePayloadHash: "h",
        exhibitionGroup: "touring",
      },
    ]);
    await db.insert(schema.userFollowedMuseums).values({ userId, museumId: 1 });
    await db
      .insert(schema.userExhibitions)
      .values({ userId, exhibitionId: 4, status: "hidden" });

    const result = await createCaller(ctx).museum.followedExhibitions();
    expect(result.map((item) => item.slug)).toEqual([
      "ends-sooner",
      "touring-followed",
      "ends-later",
    ]);
    expect(
      result.find((item) => item.slug === "touring-followed")?.venues,
    ).toHaveLength(2);
  });

  it("returns nothing when the user follows no museums", async () => {
    const result = await createCaller(ctx).museum.followedExhibitions();
    expect(result).toEqual([]);
  });
});
