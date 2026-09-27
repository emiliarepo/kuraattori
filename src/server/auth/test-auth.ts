import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * True under `next dev`, or when the Worker's own Cloudflare env carries
 * `E2E_TEST_AUTH`, which is never set outside the Playwright test server (not
 * in `wrangler.jsonc`, not a deploy secret). `next build` inlines
 * `NODE_ENV` as "production" into every built Worker, so the first check can
 * never enable the form in a deployment.
 */
export async function isTestAuthEnabled(): Promise<boolean> {
  if (process.env.NODE_ENV === "development") return true;
  const { env } = await getCloudflareContext({ async: true });
  return (env as { E2E_TEST_AUTH?: string }).E2E_TEST_AUTH === "1";
}
