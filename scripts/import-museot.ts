import { drizzle } from "drizzle-orm/d1";
import { getPlatformProxy } from "wrangler";

import { createMuseotFiAdapter } from "~/server/import/museot-fi/adapter";
import { runImport } from "~/server/import/run-import";
import * as schema from "~/server/db/schema";
import { type Db } from "~/server/db";

import { createRemoteDb } from "./d1-http-driver";

async function getDbAndDispose(): Promise<{
  db: Db;
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
    return { db: db as unknown as Db, dispose: async () => {} };
  }

  console.log("Importing against the local D1 database (.wrangler/state).");
  const proxy = await getPlatformProxy<CloudflareEnv>();
  const db = drizzle(proxy.env.DB, { schema });
  return { db, dispose: proxy.dispose };
}

async function main() {
  const { db, dispose } = await getDbAndDispose();
  try {
    const stats = await runImport(db, createMuseotFiAdapter());
    console.log(JSON.stringify(stats, null, 2));
    if (stats.status === "failed") process.exitCode = 1;
  } finally {
    await dispose();
  }
}

await main();
