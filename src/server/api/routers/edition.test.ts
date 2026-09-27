import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

const SUNDAY = "2026-10-04";

const exhibition = (id: number, startDate: string, endDate: string | null) => ({
  id,
  source: "test",
  sourceId: `e${id}`,
  museumId: 1,
  slug: `e${id}`,
  titleFi: `Näyttely ${id}`,
  startDate,
  endDate,
  sourcePayloadHash: "x",
});

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-04T12:00:00Z"));
  await db.insert(schema.museums).values({
    id: 1,
    source: "test",
    sourceId: "m1",
    name: "Sara Hildénin taidemuseo",
    slug: "sara-hilden",
    city: "Tampere",
    region: "Tampere",
  });
});

afterEach(async () => {
  vi.useRealTimers();
  await client.execute("delete from kuraattori_edition");
  await client.execute("delete from kuraattori_exhibition");
  await client.execute("delete from kuraattori_museum");
});

describe("edition API", () => {
  it("freezes an edition when first generated", async () => {
    await db
      .insert(schema.exhibitions)
      .values([
        exhibition(1, "2026-09-30", null),
        exhibition(2, "2026-01-01", "2026-10-08"),
      ]);
    const first = await createCaller(ctx).edition.get({
      region: "tampere",
      date: SUNDAY,
    });
    expect(first?.lead?.id).toBe(1);
    expect(first?.ending.map((item) => item.id)).toEqual([2]);

    await db
      .insert(schema.exhibitions)
      .values([
        exhibition(3, "2026-10-03", null),
        exhibition(4, "2026-01-01", "2026-10-06"),
      ]);
    const again = await createCaller(ctx).edition.get({
      region: "tampere",
      date: SUNDAY,
    });
    expect(again?.lead?.id).toBe(1);
    expect(again?.ending.map((item) => item.id)).toEqual([2]);
    expect(
      await createCaller(ctx).edition.archive({ region: "tampere" }),
    ).toEqual([SUNDAY]);
  });

  it("does not generate past, future or non-Sunday editions", async () => {
    const caller = createCaller(ctx).edition;
    expect(
      await caller.get({ region: "tampere", date: "2026-09-27" }),
    ).toBeNull();
    expect(
      await caller.get({ region: "tampere", date: "2026-10-11" }),
    ).toBeNull();
    expect(
      await caller.get({ region: "tampere", date: "2026-10-05" }),
    ).toBeNull();
    expect(await caller.archive({ region: "tampere" })).toEqual([]);
  });
});
