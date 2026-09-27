import { eq } from "drizzle-orm";

import { type Db } from "~/server/db";
import { exhibitions } from "~/server/db/schema";

import { createRemoteDb } from "./d1-http-driver";
import { createRemoteArchiveStore } from "./image-archive-store";

const exhibitionId = Number(process.argv[2]);
if (!Number.isInteger(exhibitionId))
  throw new Error("usage: tsx scripts/remove-image.ts <exhibition id>");

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const apiToken = process.env.CLOUDFLARE_API_TOKEN;
const databaseId = process.env.D1_DATABASE_ID;
if (!accountId || !apiToken || !databaseId)
  throw new Error(
    "CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN and D1_DATABASE_ID are required",
  );

const db = createRemoteDb({ accountId, apiToken, databaseId }) as unknown as Db;
const [row] = await db
  .select({ key: exhibitions.imageArchiveKey })
  .from(exhibitions)
  .where(eq(exhibitions.id, exhibitionId));
if (!row) throw new Error(`No exhibition ${exhibitionId}`);

if (row.key)
  await createRemoteArchiveStore({ accountId, apiToken }).delete(row.key);
await db
  .update(exhibitions)
  .set({
    imageArchiveKey: null,
    imageWidth: null,
    imageHeight: null,
    imageArchiveRemoved: true,
  })
  .where(eq(exhibitions.id, exhibitionId));
console.log(
  `Removed the archived image of exhibition ${exhibitionId}${row.key ? ` (${row.key})` : ""}.`,
);
