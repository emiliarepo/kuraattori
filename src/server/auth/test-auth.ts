import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * True only when the Worker's own Cloudflare env carries `E2E_TEST_AUTH`,
 * which is never set outside the Playwright test server (not in
 * `wrangler.jsonc`, not a deploy secret). Read at request time, unlike
 * `process.env.NODE_ENV`, which `next build` inlines to "production" for
 * every built Worker regardless of how it's run afterwards.
 */
export async function isTestAuthEnabled(): Promise<boolean> {
  const { env } = await getCloudflareContext({ async: true });
  return (env as { E2E_TEST_AUTH?: string }).E2E_TEST_AUTH === "1";
}
