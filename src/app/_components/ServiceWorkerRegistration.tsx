"use client";

import { useEffect } from "react";

// In development the worker's caches serve stale bundles and an offline page
// during slow recompiles, so dev removes any worker a previous build installed.
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV === "production") {
      void navigator.serviceWorker.register("/sw.js", { scope: "/" });
      return;
    }
    void navigator.serviceWorker
      .getRegistrations()
      .then(async (registrations) => {
        await Promise.all(
          registrations.map((registration) => registration.unregister()),
        );
        const keys = await caches.keys();
        await Promise.all(
          keys
            .filter((key) => key.startsWith("kuraattori-"))
            .map((key) => caches.delete(key)),
        );
      });
  }, []);

  return null;
}
