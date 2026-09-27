import { drizzle } from "drizzle-orm/d1";
import { getPlatformProxy } from "wrangler";

import { createMuseotFiAdapter } from "~/server/import/museot-fi/adapter";
import {
  createNominatimGeocoder,
  geocodeMuseums,
} from "~/server/import/geocode";
import {
  archiveImages,
  createImageDownloader,
  type ImageArchiveStats,
} from "~/server/import/image-archive";
import {
  MuseotFiHttpClient,
  USER_AGENT,
} from "~/server/import/museot-fi/http-client";
import { runImport } from "~/server/import/run-import";
import * as schema from "~/server/db/schema";
import { type Db } from "~/server/db";

import { createRemoteDb } from "./d1-http-driver";
import {
  createBindingArchiveStore,
  createRemoteArchiveStore,
  resizeImage,
  type ArchiveStore,
} from "./image-archive-store";

async function getDbAndDispose(): Promise<{
  db: Db;
  store: ArchiveStore;
  dispose: () => Promise<void>;
}> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  const databaseId = process.env.D1_DATABASE_ID;

  if (accountId && apiToken && databaseId) {
    console.log(
      `Importing against remote D1 database ${databaseId} via the HTTP API.`,
    );
    const db = createRemoteDb({ accountId, apiToken, databaseId });
    return {
      db: db as unknown as Db,
      store: createRemoteArchiveStore({ accountId, apiToken }),
      dispose: async () => {},
    };
  }

  console.log("Importing against the local D1 database (.wrangler/state).");
  const proxy = await getPlatformProxy<CloudflareEnv>();
  const db = drizzle(proxy.env.DB, { schema });
  return {
    db,
    store: createBindingArchiveStore(proxy.env.IMAGES_ARCHIVE),
    dispose: proxy.dispose,
  };
}

async function main() {
  const { db, store, dispose } = await getDbAndDispose();
  const startedAt = Date.now();
  try {
    const client = new MuseotFiHttpClient();
    const stats = await runImport(db, createMuseotFiAdapter(client));
    console.log(JSON.stringify(stats, null, 2));
    if (stats.status === "failed") {
      process.exitCode = 1;
      return;
    }
    const geocodingStartedAt = Date.now();
    const geocoding = await geocodeMuseums(db, createNominatimGeocoder());
    const geocodingMs = Date.now() - geocodingStartedAt;
    console.log(JSON.stringify({ geocoding }, null, 2));

    let imageArchive: ImageArchiveStats | undefined;
    try {
      imageArchive = await archiveImages(db, {
        download: createImageDownloader({
          userAgent: USER_AGENT,
          timeoutMs: 30_000,
        }),
        resize: resizeImage,
        put: store.put,
      });
      const coverage = imageArchive.withImage
        ? Math.round((imageArchive.archived / imageArchive.withImage) * 100)
        : 100;
      console.log(
        JSON.stringify({ imageArchive, coverage: `${coverage} %` }, null, 2),
      );
    } catch (error) {
      console.error(
        "Image archiving failed; the import itself succeeded.",
        error,
      );
    }

    console.log(
      JSON.stringify(
        {
          budget: {
            requests: {
              museotFi: client.requestCount,
              museumPages: stats.museumPagesFetched,
              translations: stats.translationRequests,
              geocoder: geocoding.attempted,
              images: imageArchive?.attempted ?? 0,
            },
            durationMs: {
              exhibitions: stats.phaseMs.exhibitions,
              museumPages: stats.phaseMs.museumPages,
              import: stats.phaseMs.total,
              geocoding: geocodingMs,
              images: imageArchive?.durationMs ?? 0,
              total: Date.now() - startedAt,
            },
          },
        },
        null,
        2,
      ),
    );
  } finally {
    await dispose();
  }
}

await main();
