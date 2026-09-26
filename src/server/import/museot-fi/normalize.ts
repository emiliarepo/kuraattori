import { resolveRegion } from "~/domain/regions";

import { hashListingPayload } from "../hash";
import type { NormalizedExhibition, NormalizedMuseum } from "../types";
import type { RawDetail } from "./parse-detail";
import type { RawListingItem } from "./parse-listing";

const SOURCE_URL_BASE =
  "https://museot.fi/nayttelykalenteri/index.php?nayttely_id=";

export function hashListingItem(item: RawListingItem): string {
  return hashListingPayload({
    title: item.title,
    excerpt: item.excerpt,
    museumName: item.museumName,
    city: item.city,
    imageUrl: item.imageUrl,
    startDate: item.startDate,
    endDate: item.endDate,
  });
}

/**
 * Combines a listing row with its detail-page enrichment into the DB-ready
 * shape. `categorySourceIds` comes from the topic-listing membership scrape
 * (built once per run), not the detail page: unchanged exhibitions never get
 * a detail fetch, so membership has to work the same way for both.
 */
export function normalizeExhibition(
  listing: RawListingItem,
  detail: RawDetail,
  categorySourceIds: string[],
  maakuntaByCity: ReadonlyMap<string, string>,
): NormalizedExhibition {
  const museum: NormalizedMuseum = {
    sourceId: detail.museumSourceId,
    name: detail.museumName,
    city: detail.city ?? listing.city,
    region: resolveRegion(detail.city ?? listing.city, maakuntaByCity),
    museumCardEligible: detail.museumCardEligible,
    websiteUrl: detail.websiteUrl,
  };

  return {
    sourceId: listing.sourceId,
    museum,
    title: detail.title,
    description: detail.description,
    startDate: detail.startDate,
    endDate: detail.endDate,
    sourceUrl: `${SOURCE_URL_BASE}${listing.sourceId}`,
    imageUrl: detail.imageUrl ?? listing.imageUrl,
    museumCardEligible: detail.museumCardEligible,
    categorySourceIds,
    payloadHash: hashListingItem(listing),
  };
}
