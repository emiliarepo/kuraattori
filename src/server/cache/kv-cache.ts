import { getCloudflareContext } from "@opennextjs/cloudflare";

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

  const stored = await kv.get<T>(key, "json");
  if (stored !== null) return stored;

  const value = await load();
  await kv.put(key, JSON.stringify(value), { expirationTtl: ttlSeconds });
  return value;
}
