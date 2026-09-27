import { eq, inArray } from "drizzle-orm";

import type { OpeningHours } from "~/domain/opening-hours";
import { type Db } from "~/server/db";
import {
  categories,
  exhibitionCategories,
  exhibitions,
  museums,
} from "~/server/db/schema";

import type { Classification } from "./grouping";
import { uniqueSlug } from "./slug";
import { distinctTranslation } from "./museot-fi/translations";
import type {
  ExhibitionTranslation,
  NormalizedCategory,
  NormalizedExhibition,
  NormalizedMuseum,
  MuseumLocation,
  MuseumPage,
} from "./types";

export interface ExistingRow {
  id: number;
  slug: string;
  address?: string | null;
  city?: string | null;
}

export interface ExistingMuseumRow extends ExistingRow {
  name: string;
  openingHours: OpeningHours | null;
  freeDays: string[] | null;
  pageFetchedAt: Date | null;
}

export interface ExistingExhibitionRow extends ExistingRow {
  museumId: number;
  sourcePayloadHash: string;
  translationHash: string | null;
  titleFi: string;
  startDate: string;
  endDate: string | null;
  descriptionFi: string | null;
}

export async function loadExistingMuseums(
  db: Db,
  source: string,
): Promise<Map<string, ExistingMuseumRow>> {
  const rows = await db
    .select({
      sourceId: museums.sourceId,
      id: museums.id,
      slug: museums.slug,
      name: museums.name,
      address: museums.address,
      city: museums.city,
      openingHours: museums.openingHours,
      freeDays: museums.freeDays,
      pageFetchedAt: museums.pageFetchedAt,
    })
    .from(museums)
    .where(eq(museums.source, source));
  return new Map(rows.map(({ sourceId, ...row }) => [sourceId, row]));
}

export async function updateMuseumLocation(
  db: Db,
  id: number,
  location: MuseumLocation,
  previousAddress: string | null | undefined,
): Promise<void> {
  const hasSourceCoordinates =
    location.latitude !== undefined && location.longitude !== undefined;
  // Geocoded coordinates stay valid while the address is unchanged.
  if (!hasSourceCoordinates && location.address === previousAddress) return;
  await db
    .update(museums)
    .set({
      address: location.address,
      latitude: location.latitude ?? null,
      longitude: location.longitude ?? null,
    })
    .where(eq(museums.id, id));
}

export async function loadExistingExhibitions(
  db: Db,
  source: string,
): Promise<Map<string, ExistingExhibitionRow>> {
  const rows = await db
    .select({
      sourceId: exhibitions.sourceId,
      id: exhibitions.id,
      slug: exhibitions.slug,
      museumId: exhibitions.museumId,
      sourcePayloadHash: exhibitions.sourcePayloadHash,
      translationHash: exhibitions.translationHash,
      titleFi: exhibitions.titleFi,
      startDate: exhibitions.startDate,
      endDate: exhibitions.endDate,
      descriptionFi: exhibitions.descriptionFi,
    })
    .from(exhibitions)
    .where(eq(exhibitions.source, source));
  return new Map(rows.map(({ sourceId, ...row }) => [sourceId, row]));
}

export async function loadExistingCategories(
  db: Db,
  source: string,
): Promise<Map<string, ExistingRow>> {
  const rows = await db
    .select({
      sourceId: categories.sourceId,
      id: categories.id,
      slug: categories.slug,
    })
    .from(categories)
    .where(eq(categories.source, source));
  return new Map(
    rows.map((row) => [row.sourceId, { id: row.id, slug: row.slug }]),
  );
}

/** Upserts one museum and returns its row id. Mutates `existing`/`takenSlugs` for later collision checks. */
export async function upsertMuseum(
  db: Db,
  source: string,
  museum: NormalizedMuseum,
  existing: Map<string, ExistingMuseumRow>,
  takenSlugs: Set<string>,
): Promise<number> {
  const found = existing.get(museum.sourceId);
  const now = new Date();

  if (found) {
    await db
      .update(museums)
      .set({
        name: museum.name,
        city: museum.city,
        region: museum.region,
        museumCardEligible: museum.museumCardEligible,
        websiteUrl: museum.websiteUrl,
        lastSeenAt: now,
      })
      .where(eq(museums.id, found.id));
    found.city = museum.city;
    return found.id;
  }

  const slug = uniqueSlug(museum.name, museum.sourceId, (candidate) =>
    takenSlugs.has(candidate),
  );
  takenSlugs.add(slug);

  const [row] = await db
    .insert(museums)
    .values({
      source,
      sourceId: museum.sourceId,
      name: museum.name,
      slug,
      city: museum.city,
      region: museum.region,
      museumCardEligible: museum.museumCardEligible,
      websiteUrl: museum.websiteUrl,
      lastSeenAt: now,
    })
    .returning({ id: museums.id });
  if (!row) throw new Error(`Failed to insert museum ${museum.sourceId}`);

  existing.set(museum.sourceId, {
    id: row.id,
    slug,
    name: museum.name,
    city: museum.city,
    openingHours: null,
    freeDays: null,
    pageFetchedAt: null,
  });
  return row.id;
}

export interface UpsertExhibitionResult {
  id: number;
  created: boolean;
}

export async function upsertExhibition(
  db: Db,
  source: string,
  exhibition: NormalizedExhibition,
  museumId: number,
  existing: Map<string, ExistingExhibitionRow>,
  takenSlugs: Set<string>,
): Promise<UpsertExhibitionResult> {
  const found = existing.get(exhibition.sourceId);
  const now = new Date();

  if (found) {
    await db
      .update(exhibitions)
      .set({
        museumId,
        titleFi: exhibition.title,
        descriptionFi: exhibition.description,
        startDate: exhibition.startDate,
        endDate: exhibition.endDate,
        sourceUrl: exhibition.sourceUrl,
        imageUrl: exhibition.imageUrl,
        museumCardEligible: exhibition.museumCardEligible,
        admissionText: exhibition.admissionText ?? null,
        admissionAdultCents: exhibition.admissionAdultCents ?? null,
        sourcePayloadHash: exhibition.payloadHash,
        exhibitionGroup: exhibition.exhibitionGroup,
        kind: exhibition.kind,
        lastFetchedAt: now,
        lastSeenAt: now,
      })
      .where(eq(exhibitions.id, found.id));
    found.museumId = museumId;
    found.descriptionFi = exhibition.description ?? null;
    return { id: found.id, created: false };
  }

  const slug = uniqueSlug(exhibition.title, exhibition.sourceId, (candidate) =>
    takenSlugs.has(candidate),
  );
  takenSlugs.add(slug);

  const [row] = await db
    .insert(exhibitions)
    .values({
      source,
      sourceId: exhibition.sourceId,
      museumId,
      slug,
      titleFi: exhibition.title,
      descriptionFi: exhibition.description,
      startDate: exhibition.startDate,
      endDate: exhibition.endDate,
      sourceUrl: exhibition.sourceUrl,
      imageUrl: exhibition.imageUrl,
      museumCardEligible: exhibition.museumCardEligible,
      admissionText: exhibition.admissionText,
      admissionAdultCents: exhibition.admissionAdultCents,
      sourcePayloadHash: exhibition.payloadHash,
      exhibitionGroup: exhibition.exhibitionGroup,
      kind: exhibition.kind,
      lastFetchedAt: now,
      lastSeenAt: now,
    })
    .returning({ id: exhibitions.id });
  if (!row)
    throw new Error(`Failed to insert exhibition ${exhibition.sourceId}`);

  existing.set(exhibition.sourceId, {
    id: row.id,
    slug,
    museumId,
    sourcePayloadHash: exhibition.payloadHash,
    translationHash: null,
    titleFi: exhibition.title,
    startDate: exhibition.startDate,
    endDate: exhibition.endDate ?? null,
    descriptionFi: exhibition.description ?? null,
  });
  return { id: row.id, created: true };
}

/**
 * Marks an unchanged listing as seen this run, and (re)classifies it from its
 * already-stored fields. This is how existing rows pick up `exhibitionGroup`
 * and `kind` after the migration backfilled `kind` but left `exhibitionGroup`
 * null: every run reclassifies every exhibition, changed or not.
 */
export async function touchExhibition(
  db: Db,
  id: number,
  classification: Classification,
): Promise<void> {
  await db
    .update(exhibitions)
    .set({ lastSeenAt: new Date(), ...classification })
    .where(eq(exhibitions.id, id));
}

export async function upsertCategory(
  db: Db,
  source: string,
  category: NormalizedCategory,
  existing: Map<string, ExistingRow>,
  takenSlugs: Set<string>,
): Promise<number> {
  const found = existing.get(category.sourceId);
  if (found) {
    await db
      .update(categories)
      .set({
        name: category.name,
        nameEn: category.nameEn ?? null,
        nameSv: category.nameSv ?? null,
      })
      .where(eq(categories.id, found.id));
    return found.id;
  }

  const slug = uniqueSlug(category.name, category.sourceId, (candidate) =>
    takenSlugs.has(candidate),
  );
  takenSlugs.add(slug);

  const [row] = await db
    .insert(categories)
    .values({
      source,
      sourceId: category.sourceId,
      name: category.name,
      nameEn: category.nameEn,
      nameSv: category.nameSv,
      slug,
    })
    .returning({ id: categories.id });
  if (!row) throw new Error(`Failed to insert category ${category.sourceId}`);

  existing.set(category.sourceId, { id: row.id, slug });
  return row.id;
}

/**
 * Stores an exhibition's English and Swedish text, and its museum's
 * translated name when the listing had one. A description that only repeats
 * the Finnish one is stored as missing.
 */
export async function applyTranslation(
  db: Db,
  existing: ExistingExhibitionRow,
  translation: ExhibitionTranslation,
): Promise<void> {
  const description = (text: string | undefined) =>
    distinctTranslation(text, existing.descriptionFi) ?? null;
  await db
    .update(exhibitions)
    .set({
      titleEn: translation.en.title ?? null,
      titleSv: translation.sv.title ?? null,
      descriptionEn: description(translation.en.description),
      descriptionSv: description(translation.sv.description),
      translationHash: translation.hash,
    })
    .where(eq(exhibitions.id, existing.id));
  const museumNames = {
    ...(translation.en.museumName && { nameEn: translation.en.museumName }),
    ...(translation.sv.museumName && { nameSv: translation.sv.museumName }),
  };
  if (Object.keys(museumNames).length > 0)
    await db
      .update(museums)
      .set(museumNames)
      .where(eq(museums.id, existing.museumId));
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size)
    chunks.push(items.slice(i, i + size));
  return chunks;
}

/**
 * Replaces every exhibition's category memberships with the ones supplied
 * this run. D1 allows at most 100 bound parameters per query, so deletes and
 * inserts are chunked well under that.
 */
export async function syncExhibitionCategories(
  db: Db,
  memberships: Map<number, number[]>,
): Promise<void> {
  const exhibitionIds = [...memberships.keys()];
  if (exhibitionIds.length === 0) return;

  for (const idChunk of chunk(exhibitionIds, 90)) {
    await db
      .delete(exhibitionCategories)
      .where(inArray(exhibitionCategories.exhibitionId, idChunk));
  }

  const rows = exhibitionIds.flatMap((exhibitionId) =>
    (memberships.get(exhibitionId) ?? []).map((categoryId) => ({
      exhibitionId,
      categoryId,
    })),
  );
  for (const rowChunk of chunk(rows, 40)) {
    await db.insert(exhibitionCategories).values(rowChunk);
  }
}

/**
 * Writes the hours and free days when they differ from the stored ones.
 * Unparseable hours (`undefined`) keep the previous value.
 */
export async function updateMuseumSchedule(
  db: Db,
  existing: ExistingMuseumRow,
  page: Pick<MuseumPage, "openingHours" | "freeDays">,
): Promise<void> {
  const openingHours = page.openingHours ?? existing.openingHours;
  if (
    JSON.stringify(openingHours) === JSON.stringify(existing.openingHours) &&
    JSON.stringify(page.freeDays) === JSON.stringify(existing.freeDays ?? [])
  )
    return;
  await db
    .update(museums)
    .set({ openingHours, freeDays: page.freeDays })
    .where(eq(museums.id, existing.id));
}

export async function markMuseumPageFetched(
  db: Db,
  id: number,
  at: Date,
): Promise<void> {
  await db.update(museums).set({ pageFetchedAt: at }).where(eq(museums.id, id));
}
