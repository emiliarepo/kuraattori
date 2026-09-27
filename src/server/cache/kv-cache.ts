import { getCloudflareContext } from "@opennextjs/cloudflare";

import journal from "../../../drizzle/meta/_journal.json";

// Cached shapes follow the schema: a new migration starts fresh keys instead
// of serving pre-migration entries until their TTL runs out.
const KEY_PREFIX = `${journal.entries.at(-1)?.tag ?? "0"}:`;

async function getCacheBinding(): Promise<KVNamespace | null> {
  try {
    const { env } = await getCloudflareContext({ async: true });
    return env.CACHE ?? null;
  } catch {
    // No Worker/wrangler context at all, e.g. plain Vitest runs.
    return null;
  }
}

/**
 * Caches public, non-personal reads in the `CACHE` KV namespace (see
 * wrangler.jsonc). Falls back to an uncached call whenever the binding is
 * absent, so this works before the namespace exists, outside a Worker
 * (tests), and stays correct if the binding is ever removed.
 */
export async function cached<T>(
  key: string,
  ttlSeconds: number,
  load: () => Promise<T>,
): Promise<T> {
  const kv = await getCacheBinding();
  if (!kv) return load();

  const stored = await kv.get<T>(KEY_PREFIX + key, "json");
  if (stored !== null) return stored;

  const value = await load();
  if (value === null) return value;
  await kv.put(KEY_PREFIX + key, JSON.stringify(value), {
    expirationTtl: ttlSeconds,
  });
  return value;
}
