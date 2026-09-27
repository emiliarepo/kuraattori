import { createHash } from "node:crypto";

import { and, asc, eq, isNotNull } from "drizzle-orm";

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

/** The image host asked us to slow down: 429, 503 or a dropped connection. */
export class ThrottledError extends Error {
  constructor(
    message: string,
    readonly retryAfterMs: number | undefined,
  ) {
    super(message);
  }
}

export function parseRetryAfter(
  header: string | null,
  now: number,
): number | undefined {
  if (!header) return undefined;
  const seconds = Number(header);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const date = Date.parse(header);
  return Number.isNaN(date) ? undefined : Math.max(0, date - now);
}

function isConnectionReset(error: unknown): boolean {
  for (let e = error; e instanceof Error; e = e.cause) {
    const code = (e as { code?: unknown }).code;
    if (
      code === "ECONNRESET" ||
      code === "UND_ERR_SOCKET" ||
      e.name === "SocketError"
    )
      return true;
  }
  return false;
}

export interface DownloaderOptions {
  fetch?: typeof fetch;
  userAgent: string;
  timeoutMs: number;
}

/** One request per call; pacing and backoff live in `archiveImages`. */
export function createImageDownloader({
  fetch: fetchImpl = fetch,
  userAgent,
  timeoutMs,
}: DownloaderOptions): (url: string) => Promise<Uint8Array> {
  return async (url) => {
    let response: Response;
    try {
      response = await fetchImpl(url, {
        headers: { "User-Agent": userAgent },
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      if (isConnectionReset(error))
        throw new ThrottledError(`connection reset: ${url}`, undefined);
      throw error;
    }
    if (response.status === 429 || response.status === 503)
      throw new ThrottledError(
        `${response.status}: ${url}`,
        parseRetryAfter(response.headers.get("Retry-After"), Date.now()),
      );
    if (!response.ok) throw new Error(`${response.status}: ${url}`);
    return new Uint8Array(await response.arrayBuffer());
  };
}

export interface ImageArchiveDeps {
  download: (url: string) => Promise<Uint8Array>;
  resize: (original: Uint8Array) => Promise<ResizedImage>;
  put: (key: string, body: Uint8Array) => Promise<void>;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
}

export interface ImageArchiveLimits {
  /** Downloads started per run. */
  maxDownloads: number;
  /** No new download starts after this much wall-clock time. */
  budgetMs: number;
  /** Minimum gap between download starts. */
  intervalMs: number;
  /** Consecutive throttles after which archiving stops for this run. */
  maxConsecutiveThrottles: number;
  backoffBaseMs: number;
  backoffMaxMs: number;
}

export const DEFAULT_IMAGE_ARCHIVE_LIMITS: ImageArchiveLimits = {
  maxDownloads: 150,
  budgetMs: 10 * 60_000,
  intervalMs: 550,
  maxConsecutiveThrottles: 3,
  backoffBaseMs: 5_000,
  backoffMaxMs: 120_000,
};

export interface ImageArchiveStats {
  withImage: number;
  /** Rows with a copy of their current image, after this run. */
  archived: number;
  archivedThisRun: number;
  attempted: number;
  failed: number;
  throttled: number;
  remaining: number;
  stoppedBy: "done" | "cap" | "budget" | "throttled";
  durationMs: number;
}

/**
 * Archives images whose current source URL has no copy yet, oldest
 * exhibitions first, within `limits`. A failure leaves the row untouched, so
 * the next run retries it.
 */
export async function archiveImages(
  db: Db,
  deps: ImageArchiveDeps,
  limits: ImageArchiveLimits = DEFAULT_IMAGE_ARCHIVE_LIMITS,
): Promise<ImageArchiveStats> {
  const sleep =
    deps.sleep ??
    ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const now = deps.now ?? Date.now;
  const startedAt = now();

  const rows = await db
    .select({
      id: exhibitions.id,
      imageUrl: exhibitions.imageUrl,
      imageArchiveKey: exhibitions.imageArchiveKey,
    })
    .from(exhibitions)
    .where(
      and(
        isNotNull(exhibitions.imageUrl),
        eq(exhibitions.imageArchiveRemoved, false),
      ),
    )
    .orderBy(asc(exhibitions.id));

  const todo = rows
    .map((row) => ({ ...row, key: archiveKey(row.id, row.imageUrl!) }))
    .filter((row) => row.key !== row.imageArchiveKey);

  const stats: ImageArchiveStats = {
    withImage: rows.length,
    archived: rows.length - todo.length,
    archivedThisRun: 0,
    attempted: 0,
    failed: 0,
    throttled: 0,
    remaining: 0,
    stoppedBy: "done",
    durationMs: 0,
  };

  let consecutiveThrottles = 0;
  let nextStartAt = startedAt;
  for (const row of todo) {
    if (stats.attempted >= limits.maxDownloads) {
      stats.stoppedBy = "cap";
      break;
    }
    if (nextStartAt - startedAt >= limits.budgetMs) {
      stats.stoppedBy = "budget";
      break;
    }
    const wait = nextStartAt - now();
    if (wait > 0) await sleep(wait);
    nextStartAt = now() + limits.intervalMs;

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
      stats.archivedThisRun++;
      consecutiveThrottles = 0;
    } catch (error) {
      if (!(error instanceof ThrottledError)) {
        stats.failed++;
        consecutiveThrottles = 0;
        console.warn(`Image archive failed for exhibition ${row.id}:`, error);
        continue;
      }
      stats.throttled++;
      consecutiveThrottles++;
      console.warn(`Image host throttled (${error.message})`);
      if (consecutiveThrottles >= limits.maxConsecutiveThrottles) {
        stats.stoppedBy = "throttled";
        break;
      }
      const backoff = Math.max(
        error.retryAfterMs ?? 0,
        limits.backoffBaseMs * 2 ** (consecutiveThrottles - 1),
      );
      if (backoff > limits.backoffMaxMs) {
        stats.stoppedBy = "throttled";
        break;
      }
      nextStartAt = Math.max(nextStartAt, now() + backoff);
    }
  }
  stats.remaining = stats.withImage - stats.archived;
  stats.durationMs = now() - startedAt;
  return stats;
}
