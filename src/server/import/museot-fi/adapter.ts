import type {
  ExhibitionSourceAdapter,
  FetchExhibitionsResult,
  NormalizedCategory,
} from "../types";
import { MuseotFiHttpClient } from "./http-client";
import { hashListingItem, normalizeExhibition } from "./normalize";
import { parseDetailPage } from "./parse-detail";
import { parseListingPage, type RawListingItem } from "./parse-listing";

const LISTING_PATH = "/nayttelykalenteri/index.php?kaikki=1";

/** Fetches every topic listing and returns, per exhibition source id, the set of matching topic ids. */
async function fetchTopicMembership(
  client: MuseotFiHttpClient,
  topics: { sourceId: string; name: string }[],
): Promise<Map<string, Set<string>>> {
  const membership = new Map<string, Set<string>>();
  for (const topic of topics) {
    const html = await client.getText(
      `${LISTING_PATH}&topic_${topic.sourceId}=1`,
    );
    const { items } = parseListingPage(html);
    for (const item of items) {
      const set = membership.get(item.sourceId) ?? new Set<string>();
      set.add(topic.sourceId);
      membership.set(item.sourceId, set);
    }
  }
  return membership;
}

/** Fetches every maakunta listing and returns a city → maakunta name lookup. */
async function fetchMaakuntaByCity(
  client: MuseotFiHttpClient,
  maakuntas: { id: string; name: string }[],
): Promise<Map<string, string>> {
  const byCity = new Map<string, string>();
  for (const maakunta of maakuntas) {
    const html = await client.getText(
      `${LISTING_PATH}&maakunta_id=${maakunta.id}`,
    );
    const { items } = parseListingPage(html);
    for (const item of items) byCity.set(item.city, maakunta.name);
  }
  return byCity;
}

export function createMuseotFiAdapter(): ExhibitionSourceAdapter {
  return {
    name: "museot.fi",
    async fetchExhibitions(knownHashes): Promise<FetchExhibitionsResult> {
      const client = new MuseotFiHttpClient();

      const listingHtml = await client.getText(LISTING_PATH);
      const listing = parseListingPage(listingHtml);

      const [topicMembership, maakuntaByCity] = await Promise.all([
        fetchTopicMembership(client, listing.taxonomy.topics),
        fetchMaakuntaByCity(client, listing.taxonomy.maakuntas),
      ]);

      const categories: NormalizedCategory[] = listing.taxonomy.topics.map(
        (topic) => ({
          sourceId: topic.sourceId,
          name: topic.name,
        }),
      );

      const changed: FetchExhibitionsResult["changed"] = [];
      const unchanged: FetchExhibitionsResult["unchanged"] = [];
      let failedCount = listing.failedCount;

      const categorySourceIdsFor = (item: RawListingItem): string[] =>
        listing.taxonomy.topics
          .filter((topic) =>
            topicMembership.get(item.sourceId)?.has(topic.sourceId),
          )
          .map((topic) => topic.sourceId);

      for (const item of listing.items) {
        const hash = hashListingItem(item);
        if (knownHashes.get(item.sourceId) === hash) {
          unchanged.push({
            sourceId: item.sourceId,
            categorySourceIds: categorySourceIdsFor(item),
          });
          continue;
        }

        try {
          const detailHtml = await client.getText(
            `/nayttelykalenteri/index.php?nayttely_id=${item.sourceId}`,
          );
          const detail = parseDetailPage(detailHtml);
          if (!detail) {
            failedCount++;
            continue;
          }
          changed.push(
            normalizeExhibition(
              item,
              detail,
              categorySourceIdsFor(item),
              maakuntaByCity,
            ),
          );
        } catch {
          failedCount++;
        }
      }

      return { categories, changed, unchanged, failedCount };
    },
  };
}
