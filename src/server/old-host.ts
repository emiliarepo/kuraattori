const OLD_HOST = "kuraattori.emialis.com";

/**
 * Where a request to the old domain should go, or null to serve it as is.
 * Calendar apps rarely follow redirects, so subscribed feeds stay on the old
 * host.
 */
export function oldHostRedirect(url: URL, siteUrl: URL): URL | null {
  if (url.hostname !== OLD_HOST) return null;
  if (url.pathname.startsWith("/api/calendar/")) return null;
  return new URL(url.pathname + url.search, siteUrl);
}
