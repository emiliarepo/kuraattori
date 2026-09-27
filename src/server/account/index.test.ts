import { createClient } from "@libsql/client";
import { getTableName, is, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { SQLiteTable, getTableConfig } from "drizzle-orm/sqlite-core";
import { describe, expect, it } from "vitest";

import { deleteUserData, exportUserData } from "~/server/account";
import { type Db } from "~/server/db";
import * as schema from "~/server/db/schema";

const client = createClient({ url: ":memory:" });
const libsql = drizzle(client, { schema });
await migrate(libsql, { migrationsFolder: "drizzle" });
const db = libsql as unknown as Db;

const userLinkedTables = (Object.values(schema) as unknown[])
  .filter((value): value is SQLiteTable => is(value, SQLiteTable))
  .flatMap((table) =>
    getTableConfig(table)
      .foreignKeys.map((fk) => fk.reference())
      .filter((ref) => ref.foreignTable === schema.users)
      .map((ref) => ({ table, column: ref.columns[0]!.name })),
  );

async function seedUser(id: string) {
  const email = `${id}@example.com`;
  await libsql.insert(schema.users).values({ id, email });
  await libsql.insert(schema.accounts).values({
    userId: id,
    type: "oidc",
    provider: "google",
    providerAccountId: id,
  });
  await libsql.insert(schema.sessions).values({
    sessionToken: `session-${id}`,
    userId: id,
    expires: new Date("2099-01-01"),
  });
  await libsql.insert(schema.verificationTokens).values({
    identifier: email,
    token: `token-${id}`,
    expires: new Date("2099-01-01"),
  });
  await libsql
    .insert(schema.userInterests)
    .values({ userId: id, categoryId: 1, weight: 2 });
  await libsql
    .insert(schema.userRegions)
    .values({ userId: id, region: "Uusimaa" });
  await libsql
    .insert(schema.userFollowedMuseums)
    .values({ userId: id, museumId: 1 });
  await libsql.insert(schema.userExhibitions).values({
    userId: id,
    exhibitionId: 1,
    status: "visited",
    visitedAt: new Date("2026-05-01"),
    note: "Hieno",
  });
  await libsql
    .insert(schema.calendarFeeds)
    .values({ userId: id, token: `feed-${id}` });
  await libsql.insert(schema.savedTrips).values({
    userId: id,
    place: "Tampere",
    fromDate: "2026-10-01",
    toDate: "2026-10-03",
    exhibitionIds: [1],
    days: [
      {
        city: "Tampere",
        date: "2026-10-02",
        exhibitionIds: [1],
        start: "11:00",
      },
    ],
  });
}

await libsql.insert(schema.museums).values({
  id: 1,
  source: "test",
  sourceId: "m1",
  name: "Museo",
  slug: "museo",
});
await libsql.insert(schema.exhibitions).values({
  id: 1,
  source: "test",
  sourceId: "e1",
  museumId: 1,
  slug: "e",
  titleFi: "Näyttely",
  startDate: "2026-01-01",
  sourcePayloadHash: "1",
});
await libsql.insert(schema.categories).values({
  id: 1,
  source: "test",
  sourceId: "c1",
  name: "Taide",
  slug: "taide",
});
await seedUser("gone");
await seedUser("kept");

async function countRows(userId: string) {
  const counts: Record<string, number> = {};
  for (const { table, column } of userLinkedTables) {
    const [row] = await libsql.all<{ n: number }>(
      sql`select count(*) as n from ${table} where ${sql.identifier(column)} = ${userId}`,
    );
    counts[getTableName(table)] = row!.n;
  }
  const [user] = await libsql.all<{ n: number }>(
    sql`select count(*) as n from ${schema.users} where id = ${userId}`,
  );
  counts[getTableName(schema.users)] = user!.n;
  const [tokens] = await libsql.all<{ n: number }>(
    sql`select count(*) as n from ${schema.verificationTokens} where identifier = ${`${userId}@example.com`}`,
  );
  counts[getTableName(schema.verificationTokens)] = tokens!.n;
  return counts;
}

describe("account data", () => {
  it("exports the user's rows", async () => {
    const data = await exportUserData(db, "kept");
    expect(data.user?.email).toBe("kept@example.com");
    expect(data.regions).toEqual(["Uusimaa"]);
    expect(data.exhibitions).toMatchObject([
      { status: "visited", note: "Hieno" },
    ]);
    expect(data.calendarFeed?.token).toBe("feed-kept");
    expect(data.savedTrips).toMatchObject([
      { place: "Tampere", days: [{ date: "2026-10-02", exhibitionIds: [1] }] },
    ]);
  });

  it("deletes every row linked to the user and nothing else", async () => {
    expect(userLinkedTables.length).toBeGreaterThan(0);
    await deleteUserData(db, "gone");

    const gone = await countRows("gone");
    expect(
      Object.values(gone).every((n) => n === 0),
      JSON.stringify(gone),
    ).toBe(true);
    const kept = await countRows("kept");
    expect(
      Object.values(kept).every((n) => n === 1),
      JSON.stringify(kept),
    ).toBe(true);
  });
});
