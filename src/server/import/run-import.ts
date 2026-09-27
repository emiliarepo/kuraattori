import { and, desc, eq, isNotNull } from "drizzle-orm";

import { type Db } from "~/server/db";
import {
  dataSources,
  exhibitions,
  importRuns,
  museums,
} from "~/server/db/schema";

import { classify } from "./grouping";
import { selectMuseumsForPageFetch } from "./museum-refresh";
import { importSanityError } from "./sanity";
import type { ExhibitionSourceAdapter } from "./types";
import {
  applyTranslation,
  loadExistingCategories,
  loadExistingExhibitions,
  loadExistingMuseums,
  markMuseumPageFetched,
  syncExhibitionCategories,
  touchExhibition,
  upsertCategory,
  upsertExhibition,
  upsertMuseum,
  updateMuseumLocation,
  updateMuseumSchedule,
} from "./upsert";

export interface ImportRunStats {
  status: "succeeded" | "failed";
  itemsFetched: number;
  itemsCreated: number;
  itemsUpdated: number;
  itemsUnchanged: number;
  itemsMissing: number;
  itemsFailed: number;
  errorMessage?: string;
  /** `"title (Venue A, Venue B)"` for every current exhibition_group with more than one member, for review. */
  groupedExamples: string[];
  /** Titles classified as `kind = "notice"`, for reviewing false positives. */
  noticeTitles: string[];
  /** Museums whose opening hours were missing or unparseable; their previous hours are kept. */
  hoursUnparsed: string[];
  /** Exhibitions whose English/Swedish text was stored this run. */
  translationsUpdated: number;
  /** Translated detail pages that failed; retried next run. */
  translationsFailed: number;
  /** Requests made for English and Swedish pages. */
  translationRequests: number;
  /** Museum pages requested this run; the rest are refreshed on later nights. */
  museumPagesFetched: number;
  museumCount: number;
  phaseMs: { exhibitions: number; museumPages: number; total: number };
}

async function reportGroupingAndNotices(
  db: Db,
): Promise<Pick<ImportRunStats, "groupedExamples" | "noticeTitles">> {
  const exhibitionRows = await db
    .select({
      group: exhibitions.exhibitionGroup,
      title: exhibitions.titleFi,
      museumName: museums.name,
    })
    .from(exhibitions)
    .innerJoin(museums, eq(exhibitions.museumId, museums.id))
    .where(
      and(
        eq(exhibitions.kind, "exhibition"),
        isNotNull(exhibitions.exhibitionGroup),
      ),
    );

  const byGroup = new Map<string, { title: string; museumName: string }[]>();
  for (const row of exhibitionRows) {
    if (!row.group) continue;
    const members = byGroup.get(row.group) ?? [];
    members.push({ title: row.title, museumName: row.museumName });
    byGroup.set(row.group, members);
  }
  const groupedExamples = [...byGroup.values()]
    .filter((members) => members.length > 1)
    .map(
      (members) =>
        `${members[0]!.title} (${members.map((m) => m.museumName).join(", ")})`,
    );

  const noticeRows = await db
    .select({ title: exhibitions.titleFi })
    .from(exhibitions)
    .where(eq(exhibitions.kind, "notice"));
  const noticeTitles = noticeRows.map((row) => row.title);

  return { groupedExamples, noticeTitles };
}

async function getOrCreateDataSource(
  db: Db,
  adapter: ExhibitionSourceAdapter,
): Promise<number> {
  const [existing] = await db
    .select({ id: dataSources.id })
    .from(dataSources)
    .where(eq(dataSources.name, adapter.name));
  if (existing) return existing.id;

  const [row] = await db
    .insert(dataSources)
    .values({ name: adapter.name, adapter: adapter.name })
    .returning({ id: dataSources.id });
  if (!row) throw new Error(`Failed to create data source ${adapter.name}`);
  return row.id;
}

export async function runImport(
  db: Db,
  adapter: ExhibitionSourceAdapter,
): Promise<ImportRunStats> {
  const dataSourceId = await getOrCreateDataSource(db, adapter);
  const [previousSuccessfulRun] = await db
    .select({ itemsFetched: importRuns.itemsFetched })
    .from(importRuns)
    .where(
      and(
        eq(importRuns.dataSourceId, dataSourceId),
        eq(importRuns.status, "succeeded"),
      ),
    )
    .orderBy(desc(importRuns.id))
    .limit(1);
  const [run] = await db
    .insert(importRuns)
    .values({ dataSourceId, status: "running" })
    .returning({ id: importRuns.id });
  if (!run) throw new Error("Failed to create import run");

  try {
    const stats = await performImport(db, adapter);
    const sanityError = importSanityError(
      previousSuccessfulRun?.itemsFetched,
      stats.itemsFetched,
      stats.itemsFailed,
    );

    await db
      .update(importRuns)
      .set({
        status: sanityError ? "failed" : "succeeded",
        completedAt: new Date(),
        errorMessage: sanityError,
        itemsFetched: stats.itemsFetched,
        itemsCreated: stats.itemsCreated,
        itemsUpdated: stats.itemsUpdated,
        itemsUnchanged: stats.itemsUnchanged,
        itemsMissing: stats.itemsMissing,
        itemsFailed: stats.itemsFailed,
      })
      .where(eq(importRuns.id, run.id));
    if (!sanityError) {
      await db
        .update(dataSources)
        .set({ lastSuccessfulImportAt: new Date() })
        .where(eq(dataSources.id, dataSourceId));
    }

    return {
      status: sanityError ? "failed" : "succeeded",
      ...stats,
      errorMessage: sanityError,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await db
      .update(importRuns)
      .set({ status: "failed", completedAt: new Date(), errorMessage })
      .where(eq(importRuns.id, run.id));
    return {
      status: "failed",
      itemsFetched: 0,
      itemsCreated: 0,
      itemsUpdated: 0,
      itemsUnchanged: 0,
      itemsMissing: 0,
      itemsFailed: 0,
      errorMessage,
      groupedExamples: [],
      noticeTitles: [],
      hoursUnparsed: [],
      translationsUpdated: 0,
      translationsFailed: 0,
      translationRequests: 0,
      museumPagesFetched: 0,
      museumCount: 0,
      phaseMs: { exhibitions: 0, museumPages: 0, total: 0 },
    };
  }
}

async function performImport(
  db: Db,
  adapter: ExhibitionSourceAdapter,
): Promise<Omit<ImportRunStats, "status" | "errorMessage">> {
  const source = adapter.name;
  const startedAt = Date.now();

  const existingMuseums = await loadExistingMuseums(db, source);
  const existingExhibitions = await loadExistingExhibitions(db, source);
  const existingCategories = await loadExistingCategories(db, source);
  const previousSourceIds = new Set(existingExhibitions.keys());

  const knownHashes = new Map(
    [...existingExhibitions].map(([sourceId, row]) => [
      sourceId,
      row.sourcePayloadHash,
    ]),
  );
  const knownTranslationHashes = new Map(
    [...existingExhibitions].flatMap(([sourceId, row]) =>
      row.translationHash ? [[sourceId, row.translationHash] as const] : [],
    ),
  );
  const result = await adapter.fetchExhibitions(
    knownHashes,
    knownTranslationHashes,
  );
  const exhibitionsMs = Date.now() - startedAt;

  const museumSlugs = new Set(
    [...existingMuseums.values()].map((row) => row.slug),
  );
  const exhibitionSlugs = new Set(
    [...existingExhibitions.values()].map((row) => row.slug),
  );
  const categorySlugs = new Set(
    [...existingCategories.values()].map((row) => row.slug),
  );

  const categoryIdBySourceId = new Map<string, number>();
  for (const category of result.categories) {
    const id = await upsertCategory(
      db,
      source,
      category,
      existingCategories,
      categorySlugs,
    );
    categoryIdBySourceId.set(category.sourceId, id);
  }

  const museumIdBySourceId = new Map<string, number>();
  let itemsCreated = 0;
  let itemsUpdated = 0;
  const membershipByExhibitionId = new Map<number, number[]>();
  const seenSourceIds = new Set<string>();

  for (const exhibition of result.changed) {
    seenSourceIds.add(exhibition.sourceId);

    let museumId = museumIdBySourceId.get(exhibition.museum.sourceId);
    if (museumId === undefined) {
      museumId = await upsertMuseum(
        db,
        source,
        exhibition.museum,
        existingMuseums,
        museumSlugs,
      );
      museumIdBySourceId.set(exhibition.museum.sourceId, museumId);
    }

    const { id, created } = await upsertExhibition(
      db,
      source,
      exhibition,
      museumId,
      existingExhibitions,
      exhibitionSlugs,
    );
    if (created) itemsCreated++;
    else itemsUpdated++;

    membershipByExhibitionId.set(
      id,
      exhibition.categorySourceIds
        .map((sourceId) => categoryIdBySourceId.get(sourceId))
        .filter((categoryId) => categoryId !== undefined),
    );
  }

  let museumFailures = 0;
  const hoursUnparsed: string[] = [];
  const museumPagesStartedAt = Date.now();
  const changedMuseumIds = new Set(
    result.changed.map((item) => item.museum.sourceId),
  );
  const museumsToFetch = adapter.fetchMuseumPage
    ? selectMuseumsForPageFetch(
        [...existingMuseums].map(([sourceId, museum]) => ({
          sourceId,
          museum,
          pageFetchedAt: museum.pageFetchedAt,
        })),
        changedMuseumIds,
        new Date(),
      )
    : [];
  if (adapter.fetchMuseumPage) {
    for (const { sourceId, museum } of museumsToFetch) {
      try {
        const page = await adapter.fetchMuseumPage(sourceId, museum.city);
        if (
          page.location &&
          (!museum.address || changedMuseumIds.has(sourceId))
        )
          await updateMuseumLocation(
            db,
            museum.id,
            page.location,
            museum.address,
          );
        if (!page.openingHours) hoursUnparsed.push(museum.name);
        await updateMuseumSchedule(db, museum, page);
        await markMuseumPageFetched(db, museum.id, new Date());
      } catch {
        museumFailures++;
      }
    }
  }
  const museumPagesMs = Date.now() - museumPagesStartedAt;

  let itemsUnchanged = 0;
  for (const exhibition of result.unchanged) {
    seenSourceIds.add(exhibition.sourceId);
    const existing = existingExhibitions.get(exhibition.sourceId);
    if (!existing) continue; // reported as new by the adapter but unknown here; treat as a fetch anomaly

    await touchExhibition(
      db,
      existing.id,
      classify({
        title: existing.titleFi,
        startDate: existing.startDate,
        endDate: existing.endDate ?? undefined,
        description: existing.descriptionFi ?? undefined,
      }),
    );
    itemsUnchanged++;
    membershipByExhibitionId.set(
      existing.id,
      exhibition.categorySourceIds
        .map((sourceId) => categoryIdBySourceId.get(sourceId))
        .filter((categoryId) => categoryId !== undefined),
    );
  }

  await syncExhibitionCategories(db, membershipByExhibitionId);

  let translationsUpdated = 0;
  for (const translation of result.translations) {
    const existing = existingExhibitions.get(translation.sourceId);
    if (!existing) continue; // its Finnish detail failed this run; retried with it
    await applyTranslation(db, existing, translation);
    translationsUpdated++;
  }

  const itemsMissing = [...previousSourceIds].filter(
    (id) => !seenSourceIds.has(id),
  ).length;

  const { groupedExamples, noticeTitles } = await reportGroupingAndNotices(db);

  return {
    itemsFetched: result.changed.length + result.unchanged.length,
    itemsCreated,
    itemsUpdated,
    itemsUnchanged,
    itemsMissing,
    itemsFailed: result.failedCount + museumFailures,
    groupedExamples,
    noticeTitles,
    hoursUnparsed,
    translationsUpdated,
    translationsFailed: result.translationsFailed,
    translationRequests: result.translationRequests,
    museumPagesFetched: museumsToFetch.length,
    museumCount: existingMuseums.size,
    phaseMs: {
      exhibitions: exhibitionsMs,
      museumPages: museumPagesMs,
      total: Date.now() - startedAt,
    },
  };
}
