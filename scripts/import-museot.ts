import { drizzle } from "drizzle-orm/d1";
import { getPlatformProxy } from "wrangler";

import { createMuseotFiAdapter } from "~/server/import/museot-fi/adapter";
import {
  createNominatimGeocoder,
  geocodeMuseums,
} from "~/server/import/geocode";
import { archiveImages } from "~/server/import/image-archive";
import { MuseotFiHttpClient } from "~/server/import/museot-fi/http-client";
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

// About 2 downloads/s keeps the whole backfill (~650 images) inside one run.
const IMAGE_ARCHIVE_LIMIT = 800;

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
  try {
    const stats = await runImport(db, createMuseotFiAdapter());
    console.log(JSON.stringify(stats, null, 2));
    if (stats.status === "failed") {
      process.exitCode = 1;
      return;
    }
    const geocoding = await geocodeMuseums(db, createNominatimGeocoder());
    console.log(JSON.stringify({ geocoding }, null, 2));

    try {
      const http = new MuseotFiHttpClient();
      const imageArchive = await archiveImages(
        db,
        {
          download: (url) => http.getBytes(url),
          resize: resizeImage,
          put: store.put,
        },
        IMAGE_ARCHIVE_LIMIT,
      );
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
  } finally {
    await dispose();
  }
}

await main();
