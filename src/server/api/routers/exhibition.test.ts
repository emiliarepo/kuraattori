import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { afterEach, describe, expect, it, vi } from "vitest";

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

afterEach(async () => {
  await client.execute("delete from kuraattori_exhibition_category");
  await client.execute("delete from kuraattori_exhibition");
  await client.execute("delete from kuraattori_category");
  await client.execute("delete from kuraattori_museum");
});

describe("exhibition API", () => {
  it("filters seeded SQLite exhibitions by region, phase, category and search", async () => {
    await client.batch([
      "create table if not exists kuraattori_museum (id integer primary key, source text not null, source_id text not null, name text not null, slug text not null unique, city text, region text, address text, latitude real, longitude real, museum_card_eligible integer not null default 0, website_url text, created_at integer not null default (unixepoch()), updated_at integer, last_seen_at integer not null default (unixepoch()))",
      "create table if not exists kuraattori_exhibition (id integer primary key, source text not null, source_id text not null, museum_id integer not null, slug text not null unique, title_fi text not null, title_en text, title_sv text, description_fi text, description_en text, description_sv text, start_date text not null, end_date text, source_url text, image_url text, museum_card_eligible integer not null default 0, source_payload_hash text not null, created_at integer not null default (unixepoch()), updated_at integer, last_fetched_at integer, last_seen_at integer not null default (unixepoch()))",
      "create table if not exists kuraattori_category (id integer primary key, source text not null, source_id text not null, name text not null, slug text not null unique, created_at integer not null default (unixepoch()), updated_at integer)",
      "create table if not exists kuraattori_exhibition_category (exhibition_id integer not null, category_id integer not null, primary key (exhibition_id, category_id))",
      "create table if not exists kuraattori_user_exhibition (user_id text not null, exhibition_id integer not null, status text not null, visited_at integer, created_at integer not null default (unixepoch()), updated_at integer, primary key (user_id, exhibition_id))",
    ]);
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

  it("rejects a protected procedure without a session", async () => {
    await expect(createCaller(ctx).profile.get()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });
});
