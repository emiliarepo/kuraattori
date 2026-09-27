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
  await client.execute("delete from kuraattori_user_interest");
  await client.execute("delete from kuraattori_user_exhibition");
  await client.execute("delete from kuraattori_user");
  await client.execute("delete from kuraattori_exhibition_category");
  await client.execute("delete from kuraattori_exhibition");
  await client.execute("delete from kuraattori_category");
  await client.execute("delete from kuraattori_museum");
});

describe("trip API", () => {
  it("keeps only exhibitions overlapping the range", async () => {
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
        sourceId: "before",
        museumId: 1,
        slug: "before",
        titleFi: "Ennen matkaa",
        startDate: "2026-08-01",
        endDate: "2026-09-30",
        sourcePayloadHash: "a",
      },
      {
        id: 2,
        source: "test",
        sourceId: "during",
        museumId: 1,
        slug: "during",
        titleFi: "Matkan aikana",
        startDate: "2026-09-01",
        endDate: "2026-10-05",
        sourcePayloadHash: "b",
      },
      {
        id: 3,
        source: "test",
        sourceId: "after",
        museumId: 1,
        slug: "after",
        titleFi: "Matkan jälkeen",
        startDate: "2026-10-11",
        endDate: "2026-12-31",
        sourcePayloadHash: "c",
      },
      {
        id: 4,
        source: "test",
        sourceId: "openended",
        museumId: 1,
        slug: "openended",
        titleFi: "Toistaiseksi",
        startDate: "2026-09-01",
        endDate: null,
        sourcePayloadHash: "d",
      },
    ]);

    const result = await createCaller(ctx).trip.list({
      from: "2026-10-01",
      to: "2026-10-10",
    });
    expect(result.map((item) => item.slug).sort()).toEqual([
      "during",
      "openended",
    ]);
  });

  it("filters by place, matching either a museum's region or its city", async () => {
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
      {
        id: 3,
        source: "test",
        sourceId: "m3",
        name: "Jyväskylän taidemuseo",
        slug: "jkl-taidemuseo",
        city: "Jyväskylä",
        region: "Keski-Suomi",
      },
    ]);
    await db.insert(schema.exhibitions).values([
      {
        id: 1,
        source: "test",
        sourceId: "helsinki",
        museumId: 1,
        slug: "helsinki",
        titleFi: "Helsinki",
        startDate: "2026-09-01",
        endDate: "2026-12-31",
        sourcePayloadHash: "a",
      },
      {
        id: 2,
        source: "test",
        sourceId: "tampere",
        museumId: 2,
        slug: "tampere",
        titleFi: "Tampere",
        startDate: "2026-09-01",
        endDate: "2026-12-31",
        sourcePayloadHash: "b",
      },
      {
        id: 3,
        source: "test",
        sourceId: "jkl",
        museumId: 3,
        slug: "jkl",
        titleFi: "Jyväskylä",
        startDate: "2026-09-01",
        endDate: "2026-12-31",
        sourcePayloadHash: "c",
      },
    ]);

    const byRegion = await createCaller(ctx).trip.list({
      place: "Keski-Suomi",
      from: "2026-10-01",
      to: "2026-10-10",
    });
    expect(byRegion.map((item) => item.slug)).toEqual(["jkl"]);

    const byCity = await createCaller(ctx).trip.list({
      place: "Tampere",
      from: "2026-10-01",
      to: "2026-10-10",
    });
    expect(byCity.map((item) => item.slug)).toEqual(["tampere"]);
  });

  it("sorts a signed-in user's matches by relevance first, then by closing date", async () => {
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
        slug: "closes-soonest",
        titleFi: "Päättyy pian",
        startDate: "2026-09-01",
        endDate: "2026-10-02",
        sourcePayloadHash: "a",
      },
      {
        id: 2,
        source: "test",
        sourceId: "e2",
        museumId: 1,
        slug: "closes-later",
        titleFi: "Päättyy myöhemmin",
        startDate: "2026-09-01",
        endDate: "2026-10-09",
        sourcePayloadHash: "b",
      },
      {
        id: 3,
        source: "test",
        sourceId: "e3",
        museumId: 1,
        slug: "relevant",
        titleFi: "Kiinnostava",
        startDate: "2026-09-01",
        endDate: "2026-10-05",
        sourcePayloadHash: "c",
      },
    ]);
    await db
      .insert(schema.exhibitionCategories)
      .values({ exhibitionId: 3, categoryId: 1 });
    await db
      .insert(schema.userInterests)
      .values({ userId: "u1", categoryId: 1, weight: 1 });

    const signedIn = {
      ...ctx,
      session: { user: { id: "u1" }, expires: "2099-01-01" },
    } as typeof ctx;
    const result = await createCaller(signedIn).trip.list({
      from: "2026-10-01",
      to: "2026-10-10",
    });
    expect(result.map((item) => item.slug)).toEqual([
      "relevant",
      "closes-soonest",
      "closes-later",
    ]);

    const anonymous = await createCaller(ctx).trip.list({
      from: "2026-10-01",
      to: "2026-10-10",
    });
    expect(anonymous.map((item) => item.slug)).toEqual([
      "closes-soonest",
      "relevant",
      "closes-later",
    ]);
  });
});
