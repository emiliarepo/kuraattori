import { createClient } from "@libsql/client";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { describe, expect, it } from "vitest";

import { type Db } from "~/server/db";
import * as schema from "~/server/db/schema";

import { runImport } from "./run-import";
import type { ExhibitionSourceAdapter, NormalizedExhibition } from "./types";

function exhibition(sourceId: string, museumId: string, hash: string) {
  return {
    sourceId,
    museum: {
      sourceId: museumId,
      name: `Museo ${museumId}`,
      city: "Helsinki",
      region: "Uusimaa",
      museumCardEligible: false,
      websiteUrl: undefined,
    },
    title: `Näyttely ${sourceId}`,
    description: undefined,
    startDate: "2026-09-01",
    endDate: "2026-12-31",
    sourceUrl: `https://museot.fi/${sourceId}`,
    imageUrl: undefined,
    museumCardEligible: false,
    admissionText: undefined,
    admissionAdultCents: undefined,
    categorySourceIds: [],
    payloadHash: hash,
    exhibitionGroup: sourceId,
    kind: "exhibition",
  } satisfies NormalizedExhibition;
}

function fakeAdapter(listing: NormalizedExhibition[]) {
  const pagesFetched: string[] = [];
  const adapter: ExhibitionSourceAdapter = {
    name: "museot.fi",
    fetchExhibitions: async (knownHashes) => ({
      categories: [],
      changed: listing.filter(
        (e) => knownHashes.get(e.sourceId) !== e.payloadHash,
      ),
      unchanged: listing
        .filter((e) => knownHashes.get(e.sourceId) === e.payloadHash)
        .map((e) => ({ sourceId: e.sourceId, categorySourceIds: [] })),
      translations: [],
      failedCount: 0,
      translationsFailed: 0,
      translationRequests: 0,
    }),
    fetchMuseumPage: async (sourceId) => {
      pagesFetched.push(sourceId);
      return { location: undefined, openingHours: undefined, freeDays: [] };
    },
  };
  return { adapter, pagesFetched };
}

describe("runImport museum pages", () => {
  it("fetches new and changed museums right away and the rest once they are a week old", async () => {
    const db = drizzle(createClient({ url: ":memory:" }), { schema });
    await migrate(db, { migrationsFolder: "drizzle" });

    const first = fakeAdapter([
      exhibition("e1", "A", "1"),
      exhibition("e2", "B", "1"),
    ]);
    await runImport(db as unknown as Db, first.adapter);
    expect(first.pagesFetched.sort()).toEqual(["A", "B"]);

    const second = fakeAdapter([
      exhibition("e1", "A", "1"),
      exhibition("e2", "B", "2"),
      exhibition("e3", "C", "1"),
    ]);
    const stats = await runImport(db as unknown as Db, second.adapter);
    expect(second.pagesFetched.sort()).toEqual(["B", "C"]);
    expect(stats).toMatchObject({ museumPagesFetched: 2, museumCount: 3 });

    await db
      .update(schema.museums)
      .set({ pageFetchedAt: new Date(Date.now() - 8 * 86_400_000) })
      .where(eq(schema.museums.sourceId, "A"));
    const third = fakeAdapter([
      exhibition("e1", "A", "1"),
      exhibition("e2", "B", "2"),
      exhibition("e3", "C", "1"),
    ]);
    await runImport(db as unknown as Db, third.adapter);
    expect(third.pagesFetched).toEqual(["A"]);
  });
});
