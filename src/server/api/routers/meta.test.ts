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
  await client.execute("delete from kuraattori_exhibition");
  await client.execute("delete from kuraattori_museum");
  await client.execute("delete from kuraattori_data_source");
});

describe("meta API", () => {
  it("reports no last import when no data source has succeeded yet", async () => {
    expect(await createCaller(ctx).meta.lastImportAt()).toBeNull();
  });

  it("returns the most recent successful import among enabled sources", async () => {
    await db.insert(schema.dataSources).values([
      {
        name: "museot.fi",
        adapter: "museot-fi",
        enabled: true,
        lastSuccessfulImportAt: new Date("2026-09-27T04:00:00Z"),
      },
      {
        name: "disabled-source",
        adapter: "test",
        enabled: false,
        lastSuccessfulImportAt: new Date("2026-09-28T04:00:00Z"),
      },
    ]);

    const lastImportAt = await createCaller(ctx).meta.lastImportAt();
    expect(lastImportAt).toBe(new Date("2026-09-27T04:00:00Z").toISOString());
  });

  it("hides the Museokortti filter when every exhibition is eligible", async () => {
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
      slug: "eligible",
      titleFi: "Eligible",
      startDate: "2026-01-01",
      endDate: "2026-12-31",
      museumCardEligible: true,
      sourcePayloadHash: "a",
    });

    expect(await createCaller(ctx).meta.hasIneligibleExhibitions()).toBe(false);

    await db.insert(schema.exhibitions).values({
      id: 2,
      source: "test",
      sourceId: "e2",
      museumId: 1,
      slug: "not-eligible",
      titleFi: "Not eligible",
      startDate: "2026-01-01",
      endDate: "2026-12-31",
      museumCardEligible: false,
      sourcePayloadHash: "b",
    });

    expect(await createCaller(ctx).meta.hasIneligibleExhibitions()).toBe(true);
  });

  it("lists one sitemap URL per exhibition group, leaving out long-ended ones", async () => {
    await db.insert(schema.museums).values({
      id: 1,
      source: "test",
      sourceId: "m1",
      name: "Ateneum",
      slug: "ateneum",
    });
    const exhibition = (
      id: number,
      slug: string,
      extra: Partial<typeof schema.exhibitions.$inferInsert> = {},
    ) => ({
      id,
      source: "test",
      sourceId: slug,
      museumId: 1,
      slug,
      titleFi: slug,
      startDate: "2026-01-01",
      sourcePayloadHash: slug,
      ...extra,
    });
    await db
      .insert(schema.exhibitions)
      .values([
        exhibition(3, "group-second", { exhibitionGroup: "g" }),
        exhibition(2, "group-first", { exhibitionGroup: "g" }),
        exhibition(4, "solo"),
        exhibition(6, "long-ended", { endDate: "2020-01-31" }),
        exhibition(5, "notice", { kind: "notice" }),
      ]);

    const entries = await createCaller(ctx).meta.sitemapEntries();
    expect(entries.exhibitions.map((entry) => entry.slug)).toEqual([
      "group-first",
      "solo",
    ]);
    expect(entries.museums.map((entry) => entry.slug)).toEqual(["ateneum"]);
  });
});
