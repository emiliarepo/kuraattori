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
});
