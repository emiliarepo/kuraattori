import { and, eq, isNotNull, isNull, ne, or } from "drizzle-orm";

import { type Db } from "~/server/db";
import { museums } from "~/server/db/schema";

const USER_AGENT =
  "KuraattoriBot/0.1 (+https://kuraattori.emiliarepo.dev; emiliarepo@icloud.com)";
// Nominatim's usage policy allows at most one request per second.
const MIN_INTERVAL_MS = 1100;

export type Geocoder = (
  address: string,
) => Promise<{ latitude: number; longitude: number } | null>;

export function createNominatimGeocoder(): Geocoder {
  let nextRequestAt = 0;
  return async (address) => {
    const requestAt = Math.max(nextRequestAt, Date.now());
    nextRequestAt = requestAt + MIN_INTERVAL_MS;
    const wait = requestAt - Date.now();
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));

    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", address);
    url.searchParams.set("countrycodes", "fi");
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("limit", "1");
    const response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, "Accept-Language": "fi" },
    });
    if (!response.ok)
      throw new Error(`Nominatim request failed: ${response.status}`);
    const results: { lat: string; lon: string }[] = await response.json();
    const [hit] = results;
    return hit
      ? { latitude: Number(hit.lat), longitude: Number(hit.lon) }
      : null;
  };
}

export interface GeocodeStats {
  attempted: number;
  found: number;
  failed: number;
}

/**
 * Geocodes museums that have an address but no coordinates, once per
 * address: the attempted address is stored, so a miss is only retried after
 * the address changes.
 */
export async function geocodeMuseums(
  db: Db,
  geocode: Geocoder,
): Promise<GeocodeStats> {
  const pending = await db
    .select({ id: museums.id, address: museums.address })
    .from(museums)
    .where(
      and(
        isNotNull(museums.address),
        isNull(museums.latitude),
        or(
          isNull(museums.geocodedAddress),
          ne(museums.geocodedAddress, museums.address),
        ),
      ),
    );

  const stats: GeocodeStats = { attempted: 0, found: 0, failed: 0 };
  for (const museum of pending) {
    const address = museum.address!;
    stats.attempted++;
    try {
      const hit = await geocode(address);
      await db
        .update(museums)
        .set({
          geocodedAddress: address,
          latitude: hit?.latitude ?? null,
          longitude: hit?.longitude ?? null,
        })
        .where(eq(museums.id, museum.id));
      if (hit) stats.found++;
    } catch {
      stats.failed++;
    }
  }
  return stats;
}
