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
  await client.execute("delete from kuraattori_exhibition");
  await client.execute("delete from kuraattori_museum");
});

describe("my.list", () => {
  it("joins museum details onto the user's exhibitions for a status", async () => {
    await db.insert(schema.museums).values({
      id: 1,
      source: "test",
      sourceId: "m1",
      name: "Ateneum",
      slug: "ateneum",
      city: "Helsinki",
    });
    await db.insert(schema.exhibitions).values([
      {
        id: 1,
        source: "test",
        sourceId: "e1",
        museumId: 1,
        slug: "interesting",
        titleFi: "Kiinnostava",
        startDate: "2026-01-01",
        endDate: "2026-12-31",
        sourcePayloadHash: "a",
      },
      {
        id: 2,
        source: "test",
        sourceId: "e2",
        museumId: 1,
        slug: "hidden-one",
        titleFi: "Piilotettu",
        startDate: "2026-01-01",
        endDate: "2026-12-31",
        sourcePayloadHash: "b",
      },
    ]);
    await db.insert(schema.userExhibitions).values([
      { userId, exhibitionId: 1, status: "interested" },
      { userId, exhibitionId: 2, status: "hidden" },
    ]);

    const interested = await createCaller(ctx).my.list({
      status: "interested",
    });
    expect(interested).toHaveLength(1);
    expect(interested[0]?.slug).toBe("interesting");
    expect(interested[0]?.museum.name).toBe("Ateneum");
    expect(interested[0]?.status).toBe("interested");

    const hidden = await createCaller(ctx).my.list({ status: "hidden" });
    expect(hidden.map((item) => item.slug)).toEqual(["hidden-one"]);
  });

  it("orders visits by date and returns their private notes", async () => {
    await db.insert(schema.museums).values({
      id: 1,
      source: "test",
      sourceId: "m1",
      name: "Ateneum",
      slug: "ateneum",
      city: "Helsinki",
    });
    await db.insert(schema.exhibitions).values([
      {
        id: 1,
        source: "test",
        sourceId: "e1",
        museumId: 1,
        slug: "older",
        titleFi: "Vanhempi",
        startDate: "2026-01-01",
        sourcePayloadHash: "a",
      },
      {
        id: 2,
        source: "test",
        sourceId: "e2",
        museumId: 1,
        slug: "newer",
        titleFi: "Uudempi",
        startDate: "2026-01-01",
        sourcePayloadHash: "b",
      },
    ]);
    await db.insert(schema.userExhibitions).values([
      {
        userId,
        exhibitionId: 1,
        status: "visited",
        visitedAt: new Date("2026-05-01T12:00:00Z"),
        note: "Vanha muisto",
      },
      {
        userId,
        exhibitionId: 2,
        status: "visited",
        visitedAt: new Date("2026-08-01T12:00:00Z"),
        note: "Uusi muisto",
      },
    ]);

    const visits = await createCaller(ctx).my.list({ status: "visited" });
    expect(visits.map(({ slug }) => slug)).toEqual(["newer", "older"]);
    expect(visits.map(({ visitNote }) => visitNote)).toEqual([
      "Uusi muisto",
      "Vanha muisto",
    ]);
  });
});

describe("my.endingSoonCount", () => {
  it("counts interested exhibitions ending within 7 days, ignoring other statuses and dates", async () => {
    await db.insert(schema.museums).values({
      id: 1,
      source: "test",
      sourceId: "m1",
      name: "Ateneum",
      slug: "ateneum",
      city: "Helsinki",
    });
    await db.insert(schema.exhibitions).values([
      {
        id: 1,
        source: "test",
        sourceId: "e1",
        museumId: 1,
        slug: "soon",
        titleFi: "Pian päättyvä",
        startDate: "2026-01-01",
        endDate: "2026-10-02",
        sourcePayloadHash: "a",
      },
      {
        id: 2,
        source: "test",
        sourceId: "e2",
        museumId: 1,
        slug: "later",
        titleFi: "Myöhemmin päättyvä",
        startDate: "2026-01-01",
        endDate: "2026-12-31",
        sourcePayloadHash: "b",
      },
      {
        id: 3,
        source: "test",
        sourceId: "e3",
        museumId: 1,
        slug: "visited-soon",
        titleFi: "Käyty, pian päättyvä",
        startDate: "2026-01-01",
        endDate: "2026-10-02",
        sourcePayloadHash: "c",
      },
    ]);
    await db.insert(schema.userExhibitions).values([
      { userId, exhibitionId: 1, status: "interested" },
      { userId, exhibitionId: 2, status: "interested" },
      { userId, exhibitionId: 3, status: "visited" },
    ]);

    const count = await createCaller(ctx).my.endingSoonCount();
    expect(count).toBe(1);
  });
});

describe("userExhibition.updateVisit", () => {
  it("validates exhibition date bounds and clears date and note when status changes", async () => {
    await db.insert(schema.museums).values({
      id: 1,
      source: "test",
      sourceId: "m1",
      name: "Ateneum",
      slug: "ateneum",
    });
    await db.insert(schema.exhibitions).values({
      id: 1,
      source: "test",
      sourceId: "e1",
      museumId: 1,
      slug: "boundaries",
      titleFi: "Rajat",
      startDate: "2026-01-01",
      sourcePayloadHash: "a",
    });
    await db.insert(schema.userExhibitions).values({
      userId,
      exhibitionId: 1,
      status: "visited",
      visitedAt: new Date("2026-02-01T12:00:00Z"),
      note: "Muistiinpano",
    });
    const caller = createCaller(ctx);
    await expect(
      caller.userExhibition.updateVisit({
        exhibitionId: 1,
        visitedOn: "2025-12-31",
        note: "",
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      caller.userExhibition.updateVisit({
        exhibitionId: 1,
        visitedOn: "2099-01-01",
        note: "",
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });

    await caller.userExhibition.setStatus({
      exhibitionId: 1,
      status: "hidden",
    });
    const [updated] = await db.select().from(schema.userExhibitions);
    expect(updated).toMatchObject({
      status: "hidden",
      visitedAt: null,
      note: null,
    });
  });
});
