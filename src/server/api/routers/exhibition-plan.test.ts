import { createClient, type InValue } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { describe, expect, it, vi } from "vitest";

import * as schema from "~/server/db/schema";

process.env.AUTH_SECRET ??= "test-secret";
vi.mock("~/server/auth", () => ({ auth: vi.fn() }));
const { createCaller } = await import("~/server/api/root");
const client = createClient({ url: ":memory:" });
const statements: { sql: string; params: unknown[] }[] = [];
const db = drizzle(client, {
  schema,
  logger: { logQuery: (sql, params) => statements.push({ sql, params }) },
});
await migrate(db, { migrationsFolder: "drizzle" });

async function planOf(
  call: (caller: ReturnType<typeof createCaller>) => Promise<unknown>,
  signedIn = false,
) {
  statements.length = 0;
  const caller = createCaller({
    db,
    session: signedIn ? { user: { id: "u1" } } : null,
    headers: new Headers(),
  } as unknown as Parameters<typeof createCaller>[0]);
  await call(caller);
  const query = statements.find((s) =>
    s.sql.startsWith(`select "kuraattori_exhibition"."id"`),
  )!;
  const plan = await client.execute({
    sql: `explain query plan ${query.sql}`,
    args: query.params as InValue[],
  });
  return plan.rows.map((row) => row.detail as string).join("\n");
}

// Without ANALYZE stats (D1 has none) SQLite picks the index from the query
// shape alone, so these pin the shape that keeps a page near `limit` rows.
describe("exhibition query plans", () => {
  it.each([
    ["current", { state: "current" as const }],
    ["ending soon", { state: "current" as const, endingWithinDays: 14 }],
    ["a later page", { state: "current" as const, cursor: "2027-01-01|10" }],
    ["unfiltered", {}],
    ["a category", { state: "current" as const, categoryIds: [1] }],
  ])("reads %s through the ordered end-date index", async (_, input) => {
    const plan = await planOf((caller) => caller.exhibition.list(input));
    expect(plan).toContain("exhibition_kind_end_idx");
    expect(plan).not.toContain("TEMP B-TREE");
  });

  it("filters a signed-in list without a per-row subquery", async () => {
    const plan = await planOf(
      (caller) => caller.exhibition.list({ state: "current" }),
      true,
    );
    expect(plan).toContain("exhibition_kind_end_idx");
    expect(plan).not.toContain("CORRELATED");
  });

  it("reads new exhibitions by start date", async () => {
    const plan = await planOf((caller) => caller.exhibition.new(), true);
    expect(plan).toContain("exhibition_kind_start_idx (kind=? AND startDate>");
    expect(plan).not.toContain("CORRELATED");
  });
});
