/// <reference lib="webworker" />

const CACHE_NAME = "kuraattori-v3";
const worker = /** @type {ServiceWorkerGlobalScope} */ (
  /** @type {unknown} */ (globalThis)
);
const OFFLINE_URL = "/offline";
const STATIC_URLS = [
  "/icon.svg",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon.png",
];

worker.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_URLS)),
  );
  worker.skipWaiting();
});

worker.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) => key.startsWith("kuraattori-") && key !== CACHE_NAME,
            )
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => worker.clients.claim()),
  );
});

worker.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (
    request.method !== "GET" ||
    url.origin !== worker.location.origin ||
    url.pathname.startsWith("/api/auth/") ||
    url.pathname.startsWith("/api/trpc")
  ) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirstPage(request));
    return;
  }

  if (
    url.pathname.startsWith("/_next/static/") ||
    STATIC_URLS.includes(url.pathname)
  ) {
    event.respondWith(cacheFirstAsset(request));
  }
});

/** @param {Request} request */
async function networkFirstPage(request) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const response = await fetch(request);
    if (response.ok && new URL(request.url).pathname === "/my/interested") {
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;

    return offlineResponse();
  }
}

/** @param {Request} request */
async function cacheFirstAsset(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) await cache.put(request, response.clone());
  return response;
}

function offlineResponse() {
  return new Response(
    '<!doctype html><html lang="fi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#f6f1e7"><title>Ei verkkoyhteyttä · Kuraattori</title><style>html{color-scheme:light dark}body{margin:0;background:#f6f1e7;color:#1f1a14;font:16px/1.5 system-ui,sans-serif}main{max-width:48rem;margin:0 auto;padding:4rem 1.25rem}p{color:#62594d}h1{font:500 2.5rem/1.05 Georgia,serif}@media(prefers-color-scheme:dark){body{background:#1a1612;color:#eee5d6}p{color:#a99d8c}}</style><main><p>Kuraattori</p><h1>Ei verkkoyhteyttä</h1><p>Tarkista yhteys ja yritä uudelleen.</p></main></html>',
    { headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}
