import { createClient } from "@libsql/client";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { describe, expect, it } from "vitest";

import type { OpeningHours } from "~/domain/opening-hours";
import { type Db } from "~/server/db";
import * as schema from "~/server/db/schema";

import {
  applyTranslation,
  loadExistingExhibitions,
  loadExistingMuseums,
  updateMuseumSchedule,
} from "./upsert";

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

describe("applyTranslation", () => {
  it("stores translations, drops a description that repeats the Finnish one and names the museum", async () => {
    const [museum] = await db
      .insert(schema.museums)
      .values({
        source: "test",
        sourceId: "m2",
        name: "Kiasma",
        slug: "kiasma",
      })
      .returning();
    await db.insert(schema.exhibitions).values({
      source: "test",
      sourceId: "e1",
      museumId: museum!.id,
      slug: "luola",
      titleFi: "Luola",
      descriptionFi: "Suomeksi.",
      startDate: "2026-09-01",
      sourcePayloadHash: "h",
    });
    const existing = (await loadExistingExhibitions(db, "test")).get("e1")!;

    await applyTranslation(db, existing, {
      sourceId: "e1",
      hash: "t1",
      en: {
        title: "The Cave",
        description: "In English.",
        museumName: "Museum of Contemporary Art Kiasma",
      },
      sv: { description: " Suomeksi. " },
    });

    const [row] = await db
      .select()
      .from(schema.exhibitions)
      .where(eq(schema.exhibitions.id, existing.id));
    expect(row).toMatchObject({
      titleEn: "The Cave",
      titleSv: null,
      descriptionEn: "In English.",
      descriptionSv: null,
      translationHash: "t1",
    });
    const [museumRow] = await db
      .select()
      .from(schema.museums)
      .where(eq(schema.museums.id, museum!.id));
    expect(museumRow).toMatchObject({
      nameEn: "Museum of Contemporary Art Kiasma",
      nameSv: null,
    });
  });
});
