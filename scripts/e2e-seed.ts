import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { drizzle } from "drizzle-orm/d1";
import sharp from "sharp";
import { getPlatformProxy } from "wrangler";

import * as schema from "~/server/db/schema";
import { type Db } from "~/server/db";
import { parseDetailPage } from "~/server/import/museot-fi/parse-detail";
import {
  parseListingPage,
  type RawListingItem,
} from "~/server/import/museot-fi/parse-listing";
import { normalizeExhibition } from "~/server/import/museot-fi/normalize";
import {
  parseFreeDays,
  parseMuseumPage,
  parseOpeningHours,
} from "~/server/import/museot-fi/parse-museum";
import {
  collectTranslations,
  distinctTranslation,
  parseTranslatedListing,
} from "~/server/import/museot-fi/translations";
import {
  archiveImages,
  DEFAULT_IMAGE_ARCHIVE_LIMITS,
} from "~/server/import/image-archive";
import { runImport } from "~/server/import/run-import";
import type {
  ExhibitionSourceAdapter,
  MuseumLocation,
  NormalizedCategory,
  NormalizedExhibition,
} from "~/server/import/types";

import { createBindingArchiveStore, resizeImage } from "./image-archive-store";

const FIXTURES_DIR = join(import.meta.dirname, "..", "fixtures", "museot");
const PERSIST_PATH = join(
  import.meta.dirname,
  "..",
  process.env.E2E_PERSIST_DIR ?? ".wrangler/state-e2e",
);
const TOPIC_IDS = ["63", "71"] as const;

/**
 * Curated from the real `fixtures/museot/listing-all.html` snapshot: a small
 * spread of current/ending-soon/upcoming exhibitions across a few cities and
 * museums, enough to drive every ticket-27 E2E flow without importing all 640
 * listed exhibitions. 41732 has a real detail-page fixture and anchors the
 * exhibition-detail test; the rest get a synthesized detail page built from
 * their own (real) listing row — see `synthesizeDetailHtml`.
 */
const CURATED_SOURCE_IDS = [
  "41732", // upcoming, Kiasma, real detail fixture
  "44918", // current, ends in 14 days, no English or Swedish text (the Finnish-fallback E2E case)
  "43651", // current, ends in 7 days
  "44638", // current, ends in 13 days, no region mapping (exercises the unmapped-city path)
  "42095", // current, opened yesterday, ends far in the future
  "41728", // current, ends today, Kiasma (same museum as 41732)
  "41730", // upcoming, Kiasma
  "41731", // upcoming, Ateneum
  "42452", // upcoming, Tampere
  "41934", // upcoming, Espoo
  "11418", // current (long-running), Espoo
  "26231", // current (long-running), Helsinki
  "37464", // current, Turku
  "41914", // current, Lappeenranta
  "42181", // current, Rauma
  "41877", // current, ends today, Savonlinna
] as const;

/** Museums with a `museum-<id>.html` fixture get their location and hours from it; this second Helsinki museum gives the day planner a walking leg. */
const EXTRA_LOCATIONS: Record<string, MuseumLocation> = {
  "LUOMUS Kaisaniemen kasvitieteellinen puutarha": {
    address: "Kaisaniemenranta 2, 00170 Helsinki",
    latitude: 60.1745,
    longitude: 24.9461,
  },
};

function readFixture(name: string): string {
  return readFileSync(join(FIXTURES_DIR, name), "utf-8");
}

function isoToFinnish(date: string): string {
  const [year, month, day] = date.split("-");
  return `${Number(day)}.${Number(month)}.${year}`;
}

/**
 * A detail page in the same shape `parseDetailPage` expects, built entirely
 * from the item's own real listing row (title, museum, dates, excerpt,
 * image) plus its topic-listing category membership. Museokortti eligibility
 * is fixed to `true`, matching design.md's note that a real sample came back
 * 100% eligible.
 */
function synthesizeDetailHtml(
  item: RawListingItem,
  museumSourceId: string,
  categorySourceIds: readonly string[],
): string {
  const range = item.endDate
    ? `${isoToFinnish(item.startDate)}–${isoToFinnish(item.endDate)}`
    : `${isoToFinnish(item.startDate)}–`;
  const categoryLinks = categorySourceIds
    .map(
      (id) =>
        `<li><a href="/nayttelykalenteri/index.php?kaikki=1&topic_${id}=1">${id}</a></li>`,
    )
    .join("");
  return `
    <h1>${item.title}</h1>
    <p class="paikka"><a href="/museohaku/index.php?museo_id=${museumSourceId}">${item.museumName}</a>, ${item.city}</p>
    <ul><li class="ajankohta">${range}</li></ul>
    <div class="p_1"><p>${item.excerpt}</p></div>
    <div class="paakuva"><img data-x-src="${item.imageUrl ?? ""}"></div>
    <div class="sisaanpaasy_museokortilla"><img alt="Sisäänpääsy Museokortilla"></div>
    <div><h2 class="kategoriat">Aiheet</h2><ul>${categoryLinks}</ul></div>
  `;
}

async function main() {
  const listing = parseListingPage(readFixture("listing-all.html"));
  const byId = new Map(listing.items.map((item) => [item.sourceId, item]));

  const topicMembership = new Map(
    TOPIC_IDS.map((topicId) => [
      topicId,
      new Set(
        parseListingPage(
          readFixture(`listing-topic-${topicId}.html`),
        ).items.map((item) => item.sourceId),
      ),
    ]),
  );
  const categorySourceIdsFor = (sourceId: string): string[] =>
    TOPIC_IDS.filter((topicId) => topicMembership.get(topicId)?.has(sourceId));

  const maakuntaListing = parseListingPage(
    readFixture("listing-maakunta-1.html"),
  );
  const maakuntaName = listing.taxonomy.maakuntas.find(
    (maakunta) => maakunta.id === "1",
  )?.name;
  if (!maakuntaName)
    throw new Error("maakunta 1 missing from listing taxonomy");
  const maakuntaByCity = new Map(
    maakuntaListing.items.map((item) => [item.city, maakuntaName]),
  );

  const categories: NormalizedCategory[] = TOPIC_IDS.map((topicId) => {
    const topic = listing.taxonomy.topics.find(
      (candidate) => candidate.sourceId === topicId,
    );
    if (!topic)
      throw new Error(`topic ${topicId} missing from listing taxonomy`);
    return { sourceId: topic.sourceId, name: topic.name };
  });

  // Keeps every exhibition at the same real-world museum on one museum row:
  // synthesized details invent a museum id, so the first exhibition seen at a
  // museum (here, 41732's real detail fixture for Kiasma) fixes the id that
  // later synthesized exhibitions at the same museum reuse.
  const museumSourceIdByName = new Map<string, string>();
  let nextSyntheticMuseumId = 900001;
  function museumSourceIdFor(name: string): string {
    const existing = museumSourceIdByName.get(name);
    if (existing) return existing;
    const id = String(nextSyntheticMuseumId++);
    museumSourceIdByName.set(name, id);
    return id;
  }

  const [anchorId, ...restIds] = CURATED_SOURCE_IDS;
  const anchorItem = byId.get(anchorId);
  if (!anchorItem)
    throw new Error(`fixture listing is missing source id ${anchorId}`);
  const anchorDetail = parseDetailPage(readFixture("detail-41732.html"));
  if (!anchorDetail)
    throw new Error("detail-41732.html fixture failed to parse");
  museumSourceIdByName.set(
    anchorDetail.museumName,
    anchorDetail.museumSourceId,
  );

  const changed: NormalizedExhibition[] = [
    normalizeExhibition(
      anchorItem,
      anchorDetail,
      categorySourceIdsFor(anchorId),
      maakuntaByCity,
    ),
    ...restIds.map((sourceId) => {
      const item = byId.get(sourceId);
      if (!item)
        throw new Error(`fixture listing is missing source id ${sourceId}`);
      const categorySourceIds = categorySourceIdsFor(sourceId);
      const detail = parseDetailPage(
        synthesizeDetailHtml(
          item,
          museumSourceIdFor(item.museumName),
          categorySourceIds,
        ),
      );
      if (!detail)
        throw new Error(
          `synthesized detail page for ${sourceId} failed to parse`,
        );
      return normalizeExhibition(
        item,
        detail,
        categorySourceIds,
        maakuntaByCity,
      );
    }),
  ];

  // Real English/Swedish listing snapshots; a translated detail page comes
  // from its fixture when there is one (41732), otherwise from the listing
  // row's own translated excerpt.
  const translatedListings = {
    en: parseTranslatedListing(readFixture("listing-all-en.html")),
    sv: parseTranslatedListing(readFixture("listing-all-sv.html")),
  };
  for (const category of categories) {
    category.nameEn = distinctTranslation(
      translatedListings.en.topics.get(category.sourceId),
      category.name,
    );
    category.nameSv = distinctTranslation(
      translatedListings.sv.topics.get(category.sourceId),
      category.name,
    );
  }
  const { translations } = await collectTranslations(
    CURATED_SOURCE_IDS.map((sourceId) => byId.get(sourceId)!),
    translatedListings,
    new Map(),
    (locale, sourceId) => {
      const fixture = `detail-${sourceId}-${locale}.html`;
      if (existsSync(join(FIXTURES_DIR, fixture)))
        return Promise.resolve(readFixture(fixture));
      const row = translatedListings[locale].items.get(sourceId);
      return Promise.resolve(
        row &&
          `<h1>${row.title}</h1><div class="p_1"><p>${row.excerpt}</p></div>`,
      );
    },
  );

  const adapter: ExhibitionSourceAdapter = {
    name: "museot.fi",
    fetchExhibitions: () =>
      Promise.resolve({
        categories,
        changed,
        unchanged: [],
        translations,
        failedCount: 0,
        translationsFailed: 0,
        translationRequests: 0,
      }),
    fetchMuseumPage: async (sourceId) => {
      const fixture = `museum-${sourceId}.html`;
      if (existsSync(join(FIXTURES_DIR, fixture))) {
        const html = readFixture(fixture);
        return {
          location: parseMuseumPage(html),
          openingHours: parseOpeningHours(html),
          freeDays: parseFreeDays(html),
        };
      }
      const name = [...museumSourceIdByName].find(
        ([, id]) => id === sourceId,
      )?.[0];
      return {
        location: name ? EXTRA_LOCATIONS[name] : undefined,
        openingHours: undefined,
        freeDays: [],
      };
    },
  };

  // `wrangler dev --persist-to X` (and `d1 migrations apply --persist-to X`)
  // store under `X/v3`; `getPlatformProxy`'s `persist.path` is used as-is, so
  // it needs the `v3` segment added to land in the same place.
  const proxy = await getPlatformProxy<CloudflareEnv>({
    persist: { path: join(PERSIST_PATH, "v3") },
  });
  try {
    const db: Db = drizzle(proxy.env.DB, { schema });
    const stats = await runImport(db, adapter);
    console.log(JSON.stringify(stats, null, 2));
    if (stats.status === "failed") throw new Error(stats.errorMessage);

    const placeholder = await sharp({
      create: { width: 1600, height: 1200, channels: 3, background: "#8a6d3b" },
    })
      .jpeg()
      .toBuffer();
    const imageArchive = await archiveImages(
      db,
      {
        download: () => Promise.resolve(placeholder),
        resize: resizeImage,
        put: createBindingArchiveStore(proxy.env.IMAGES_ARCHIVE).put,
      },
      {
        ...DEFAULT_IMAGE_ARCHIVE_LIMITS,
        maxDownloads: Infinity,
        budgetMs: Infinity,
        intervalMs: 0,
      },
    );
    console.log(JSON.stringify({ imageArchive }, null, 2));
  } finally {
    await proxy.dispose();
  }
}

await main();
