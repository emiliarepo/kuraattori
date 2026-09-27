import { getCloudflareContext } from "@opennextjs/cloudflare";

import { i18nFor } from "~/i18n";
import { type Locale } from "~/i18n/locales";

export const MAINTENANCE_KV_KEY = "maintenance";

/** How long an isolate trusts its last KV read before checking again (issues/39-cost-guardrails.md). */
const ISOLATE_CACHE_TTL_MS = 60_000;

export interface MaintenanceFlag {
  reason: string;
  /** ISO 8601 timestamp; the flag is inactive once this passes. */
  expiresAt: string;
}

export function isExpired(flag: MaintenanceFlag, now: Date): boolean {
  return Date.parse(flag.expiresAt) <= now.getTime();
}

let isolateFlag: MaintenanceFlag | null | undefined;
let isolateCachedAt = 0;

async function readFlagFromKv(): Promise<MaintenanceFlag | null> {
  const { env } = await getCloudflareContext({ async: true });
  const kv = env.CACHE;
  if (!kv) return null;
  const flag = await kv.get<MaintenanceFlag>(MAINTENANCE_KV_KEY, "json");
  if (!flag || isExpired(flag, new Date())) return null;
  return flag;
}

/**
 * The one KV read every request needs before touching anything else,
 * held in isolate memory for a minute so the check itself can't become
 * the cost problem it's guarding against.
 */
export async function getMaintenanceFlag(): Promise<MaintenanceFlag | null> {
  const now = Date.now();
  if (
    isolateFlag !== undefined &&
    now - isolateCachedAt < ISOLATE_CACHE_TTL_MS
  ) {
    return isolateFlag;
  }
  isolateFlag = await readFlagFromKv();
  isolateCachedAt = now;
  return isolateFlag;
}

/** Test-only: clears the isolate cache between cases. */
export function resetMaintenanceFlagCache(): void {
  isolateFlag = undefined;
  isolateCachedAt = 0;
}

export function buildMaintenanceResponse(
  flag: MaintenanceFlag,
  locale: Locale = "fi",
): Response {
  const { t } = i18nFor(locale);
  const retryAfterSeconds = Math.max(
    60,
    Math.round((Date.parse(flag.expiresAt) - Date.now()) / 1000),
  );
  const html = `<!doctype html>
<html lang="${locale}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${t.app.name} – ${t.pages.maintenance.title}</title>
<style>
  body { font-family: system-ui, sans-serif; background: #fff; color: #111; margin: 0; display: flex; min-height: 100svh; align-items: center; justify-content: center; padding: 1.5rem; }
  main { max-width: 32rem; text-align: center; }
  h1 { font-size: 1.25rem; margin: 0 0 0.5rem; }
  p { margin: 0; color: #444; }
</style>
</head>
<body>
<main>
<h1>${t.pages.maintenance.title}</h1>
<p>${t.pages.maintenance.body}</p>
</main>
</body>
</html>`;
  return new Response(html, {
    status: 503,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Retry-After": String(retryAfterSeconds),
      "Cache-Control": "no-store",
    },
  });
}
