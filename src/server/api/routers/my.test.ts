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
  it("sorts interested exhibitions by closing, added, opening, and Finnish name", async () => {
    await db.insert(schema.museums).values({
      id: 1,
      source: "test",
      sourceId: "m1",
      name: "Museo",
      slug: "museo",
    });
    await db.insert(schema.exhibitions).values([
      {
        id: 1,
        source: "test",
        sourceId: "e1",
        museumId: 1,
        slug: "z",
        titleFi: "Zeta",
        startDate: "2026-01-01",
        endDate: "2026-10-01",
        sourcePayloadHash: "1",
      },
      {
        id: 2,
        source: "test",
        sourceId: "e2",
        museumId: 1,
        slug: "a",
        titleFi: "Åbo",
        startDate: "2026-11-01",
        endDate: "2026-12-01",
        sourcePayloadHash: "2",
      },
      {
        id: 3,
        source: "test",
        sourceId: "e3",
        museumId: 1,
        slug: "b",
        titleFi: "Ääni",
        startDate: "2026-10-01",
        endDate: null,
        sourcePayloadHash: "3",
      },
      {
        id: 4,
        source: "test",
        sourceId: "e4",
        museumId: 1,
        slug: "c",
        titleFi: "Öljy",
        startDate: "2026-01-01",
        endDate: "2026-09-01",
        sourcePayloadHash: "4",
      },
      {
        id: 5,
        source: "test",
        sourceId: "e5",
        museumId: 1,
        slug: "d",
        titleFi: "Aalto",
        startDate: "2026-10-01",
        endDate: "2026-10-01",
        sourcePayloadHash: "5",
      },
    ]);
    await db.insert(schema.userExhibitions).values(
      [1, 2, 3, 4, 5].map((exhibitionId) => ({
        userId,
        exhibitionId,
        status: "interested" as const,
        createdAt: new Date(`2026-08-0${exhibitionId}T12:00:00Z`),
      })),
    );
    const list = (sort?: "ending" | "added" | "opening" | "name") =>
      createCaller(ctx).my.list({ status: "interested", sort });
    expect((await list()).map((item) => item.id)).toEqual([1, 5, 2, 3, 4]);
    expect((await list("added")).map((item) => item.id)).toEqual([
      5, 4, 3, 2, 1,
    ]);
    expect((await list("opening")).map((item) => item.id)).toEqual([
      3, 5, 2, 1, 4,
    ]);
    expect((await list("name")).map((item) => item.id)).toEqual([
      5, 1, 2, 3, 4,
    ]);
    await expect(
      createCaller(ctx).my.list({
        status: "interested",
        sort: "visited-newest",
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("sorts visits and hidden entries by status dates, with id ties", async () => {
    await db.insert(schema.museums).values({
      id: 1,
      source: "test",
      sourceId: "m1",
      name: "Museo",
      slug: "museo",
    });
    await db.insert(schema.exhibitions).values(
      [1, 2, 3, 4, 5, 6].map((id) => ({
        id,
        source: "test",
        sourceId: `e${id}`,
        museumId: 1,
        slug: `e${id}`,
        titleFi:
          id === 4 ? "Åbo" : id === 5 ? "Beta" : id === 6 ? "Aalto" : "Aalto",
        startDate: "2026-01-01",
        sourcePayloadHash: `${id}`,
      })),
    );
    await db.insert(schema.userExhibitions).values([
      {
        userId,
        exhibitionId: 1,
        status: "visited",
        visitedAt: new Date("2026-01-01T12:00:00Z"),
      },
      {
        userId,
        exhibitionId: 2,
        status: "visited",
        visitedAt: new Date("2026-02-01T12:00:00Z"),
      },
      {
        userId,
        exhibitionId: 3,
        status: "visited",
        visitedAt: new Date("2026-02-01T12:00:00Z"),
      },
      {
        userId,
        exhibitionId: 4,
        status: "hidden",
        createdAt: new Date("2026-03-01T12:00:00Z"),
        updatedAt: new Date("2026-04-01T12:00:00Z"),
      },
      {
        userId,
        exhibitionId: 5,
        status: "hidden",
        createdAt: new Date("2026-05-01T12:00:00Z"),
      },
      {
        userId,
        exhibitionId: 6,
        status: "hidden",
        createdAt: new Date("2026-05-01T12:00:00Z"),
      },
    ]);
    const caller = createCaller(ctx);
    expect(
      (await caller.my.list({ status: "visited" })).map((item) => item.id),
    ).toEqual([2, 3, 1]);
    expect(
      (await caller.my.list({ status: "visited", sort: "visited-oldest" })).map(
        (item) => item.id,
      ),
    ).toEqual([1, 2, 3]);
    expect(
      (await caller.my.list({ status: "visited", sort: "name" })).map(
        (item) => item.id,
      ),
    ).toEqual([1, 2, 3]);
    expect(
      (await caller.my.list({ status: "hidden" })).map((item) => item.id),
    ).toEqual([5, 6, 4]);
    expect(
      (await caller.my.list({ status: "hidden", sort: "name" })).map(
        (item) => item.id,
      ),
    ).toEqual([6, 5, 4]);
  });

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

describe("my.stamps", () => {
  it("returns the first visit per museum, ignoring other statuses", async () => {
    await db.insert(schema.museums).values([
      { id: 1, source: "test", sourceId: "m1", name: "A", slug: "a" },
      { id: 2, source: "test", sourceId: "m2", name: "B", slug: "b" },
    ]);
    await db.insert(schema.exhibitions).values(
      [1, 2, 3].map((id) => ({
        id,
        source: "test",
        sourceId: `e${id}`,
        museumId: id === 3 ? 2 : 1,
        slug: `e${id}`,
        titleFi: `E${id}`,
        startDate: "2026-01-01",
        sourcePayloadHash: String(id),
      })),
    );
    await db.insert(schema.userExhibitions).values([
      {
        userId,
        exhibitionId: 1,
        status: "visited",
        visitedAt: new Date("2026-05-01T10:00:00Z"),
      },
      {
        userId,
        exhibitionId: 2,
        status: "visited",
        visitedAt: new Date("2026-03-01T10:00:00Z"),
      },
      { userId, exhibitionId: 3, status: "interested" },
    ]);
    const stamps = await createCaller(ctx).my.stamps();
    expect([...stamps]).toEqual([[1, new Date("2026-03-01T10:00:00Z")]]);
  });
});
