import { createHash } from "node:crypto";

import { and, eq, isNotNull } from "drizzle-orm";

import { type Db } from "~/server/db";
import { exhibitions } from "~/server/db/schema";

export const IMAGE_ARCHIVE_BUCKET = "kuraattori-images";

/** A new source URL gets a new key, so archived objects never change. */
export function archiveKey(exhibitionId: number, sourceUrl: string): string {
  const hash = createHash("sha1").update(sourceUrl).digest("hex");
  return `exhibitions/${exhibitionId}/${hash}.webp`;
}

export interface ResizedImage {
  body: Uint8Array;
  width: number;
  height: number;
}

export interface ImageArchiveDeps {
  download: (url: string) => Promise<Uint8Array>;
  resize: (original: Uint8Array) => Promise<ResizedImage>;
  put: (key: string, body: Uint8Array) => Promise<void>;
}

export interface ImageArchiveStats {
  withImage: number;
  archived: number;
  attempted: number;
  failed: number;
  pending: number;
}

/**
 * Archives images whose current source URL has no copy yet, most recently
 * seen exhibitions first and at most `limit` per run. A failure leaves the
 * row untouched, so the next run retries it.
 */
export async function archiveImages(
  db: Db,
  deps: ImageArchiveDeps,
  limit: number,
): Promise<ImageArchiveStats> {
  const rows = await db
    .select({
      id: exhibitions.id,
      imageUrl: exhibitions.imageUrl,
      imageArchiveKey: exhibitions.imageArchiveKey,
      lastSeenAt: exhibitions.lastSeenAt,
    })
    .from(exhibitions)
    .where(
      and(
        isNotNull(exhibitions.imageUrl),
        eq(exhibitions.imageArchiveRemoved, false),
      ),
    );

  const todo = rows
    .map((row) => ({ ...row, key: archiveKey(row.id, row.imageUrl!) }))
    .filter((row) => row.key !== row.imageArchiveKey)
    .sort((a, b) => b.lastSeenAt.getTime() - a.lastSeenAt.getTime());

  const stats: ImageArchiveStats = {
    withImage: rows.length,
    archived: rows.length - todo.length,
    attempted: 0,
    failed: 0,
    pending: 0,
  };
  for (const row of todo.slice(0, limit)) {
    stats.attempted++;
    try {
      const image = await deps.resize(await deps.download(row.imageUrl!));
      await deps.put(row.key, image.body);
      await db
        .update(exhibitions)
        .set({
          imageArchiveKey: row.key,
          imageWidth: image.width,
          imageHeight: image.height,
        })
        .where(eq(exhibitions.id, row.id));
      stats.archived++;
    } catch (error) {
      stats.failed++;
      console.warn(`Image archive failed for exhibition ${row.id}:`, error);
    }
  }
  stats.pending = stats.withImage - stats.archived;
  return stats;
}
