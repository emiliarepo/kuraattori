import type { categories, exhibitions, museums } from "./schema";

/**
 * KV-cached rows round-trip through `JSON.stringify`/`.parse`, which turns
 * `Date` columns into strings; these convert row shapes to and from a
 * JSON-safe form so cached and freshly-queried rows have the same real type.
 */

type Museum = typeof museums.$inferSelect;
type SerializedMuseum = Omit<
  Museum,
  "createdAt" | "updatedAt" | "lastSeenAt"
> & {
  createdAt: string;
  updatedAt: string | null;
  lastSeenAt: string;
};

export function serializeMuseum(museum: Museum): SerializedMuseum {
  return {
    ...museum,
    createdAt: museum.createdAt.toISOString(),
    updatedAt: museum.updatedAt?.toISOString() ?? null,
    lastSeenAt: museum.lastSeenAt.toISOString(),
  };
}

export function deserializeMuseum(museum: SerializedMuseum): Museum {
  return {
    ...museum,
    createdAt: new Date(museum.createdAt),
    updatedAt: museum.updatedAt ? new Date(museum.updatedAt) : null,
    lastSeenAt: new Date(museum.lastSeenAt),
  };
}

type Category = typeof categories.$inferSelect;
type SerializedCategory = Omit<Category, "createdAt" | "updatedAt"> & {
  createdAt: string;
  updatedAt: string | null;
};

export function serializeCategory(category: Category): SerializedCategory {
  return {
    ...category,
    createdAt: category.createdAt.toISOString(),
    updatedAt: category.updatedAt?.toISOString() ?? null,
  };
}

export function deserializeCategory(category: SerializedCategory): Category {
  return {
    ...category,
    createdAt: new Date(category.createdAt),
    updatedAt: category.updatedAt ? new Date(category.updatedAt) : null,
  };
}

type Exhibition = typeof exhibitions.$inferSelect;
type SerializedExhibition = Omit<
  Exhibition,
  "createdAt" | "updatedAt" | "lastFetchedAt" | "lastSeenAt"
> & {
  createdAt: string;
  updatedAt: string | null;
  lastFetchedAt: string | null;
  lastSeenAt: string;
};

export function serializeExhibition(
  exhibition: Exhibition,
): SerializedExhibition {
  return {
    ...exhibition,
    createdAt: exhibition.createdAt.toISOString(),
    updatedAt: exhibition.updatedAt?.toISOString() ?? null,
    lastFetchedAt: exhibition.lastFetchedAt?.toISOString() ?? null,
    lastSeenAt: exhibition.lastSeenAt.toISOString(),
  };
}

export function deserializeExhibition(
  exhibition: SerializedExhibition,
): Exhibition {
  return {
    ...exhibition,
    createdAt: new Date(exhibition.createdAt),
    updatedAt: exhibition.updatedAt ? new Date(exhibition.updatedAt) : null,
    lastFetchedAt: exhibition.lastFetchedAt
      ? new Date(exhibition.lastFetchedAt)
      : null,
    lastSeenAt: new Date(exhibition.lastSeenAt),
  };
}
