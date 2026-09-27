import { createClient } from "@libsql/client";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { describe, expect, it } from "vitest";

import type { OpeningHours } from "~/domain/opening-hours";
import { type Db } from "~/server/db";
import * as schema from "~/server/db/schema";

import { loadExistingMuseums, updateMuseumSchedule } from "./upsert";

const client = createClient({ url: ":memory:" });
const db = drizzle(client, { schema }) as unknown as Db;
await migrate(drizzle(client), { migrationsFolder: "drizzle" });

const tuesdaysOnly: OpeningHours = {
  days: [null, { open: "10:00", close: "16:00" }, null, null, null, null, null],
};

describe("updateMuseumSchedule", () => {
  it("keeps the previous hours when the new page has none, but replaces free days", async () => {
    await db.insert(schema.museums).values({
      source: "test",
      sourceId: "m1",
      name: "Museo",
      slug: "museo",
      openingHours: tuesdaysOnly,
      freeDays: ["2026-10-02"],
    });
    const existing = (await loadExistingMuseums(db, "test")).get("m1")!;

    await updateMuseumSchedule(db, existing, {
      openingHours: undefined,
      freeDays: ["2026-11-06"],
    });

    const [row] = await db
      .select()
      .from(schema.museums)
      .where(eq(schema.museums.id, existing.id));
    expect(row?.openingHours).toEqual(tuesdaysOnly);
    expect(row?.freeDays).toEqual(["2026-11-06"]);
  });
});
