import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import * as schema from "~/server/db/schema";

process.env.AUTH_SECRET ??= "test-secret";
vi.mock("~/server/auth", () => ({ auth: vi.fn() }));
const { createCaller } = await import("~/server/api/root");
const client = createClient({ url: ":memory:" });
const db = drizzle(client, { schema, casing: "snake_case" });
const ctx = {
  db,
  session: null,
  headers: new Headers(),
} as unknown as Parameters<typeof createCaller>[0];

beforeAll(async () => {
  await client.batch([
    "create table if not exists kuraattori_data_source (id integer primary key, name text not null unique, adapter text not null, enabled integer not null default 1, last_successful_import_at integer, created_at integer not null default (unixepoch()), updated_at integer)",
    "create table if not exists kuraattori_museum (id integer primary key, source text not null, source_id text not null, name text not null, slug text not null unique, city text, region text, address text, latitude real, longitude real, museum_card_eligible integer not null default 0, website_url text, created_at integer not null default (unixepoch()), updated_at integer, last_seen_at integer not null default (unixepoch()))",
    "create table if not exists kuraattori_exhibition (id integer primary key, source text not null, source_id text not null, museum_id integer not null, slug text not null unique, title_fi text not null, title_en text, title_sv text, description_fi text, description_en text, description_sv text, start_date text not null, end_date text, source_url text, image_url text, museum_card_eligible integer not null default 0, source_payload_hash text not null, created_at integer not null default (unixepoch()), updated_at integer, last_fetched_at integer, last_seen_at integer not null default (unixepoch()))",
  ]);
});

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
    await db
      .insert(schema.museums)
      .values({
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
});
