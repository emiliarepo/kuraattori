export function isApplePlatform(
  userAgent: string,
  platform: string,
  maxTouchPoints: number,
): boolean {
  return (
    /iPhone|iPad|iPod/i.test(userAgent) ||
    /Mac/i.test(platform) ||
    (/Macintosh/i.test(userAgent) && maxTouchPoints > 1)
  );
}

export function mapHref(name: string, address: string, apple: boolean): string {
  const query = encodeURIComponent(`${name}, ${address}`);
  return apple
    ? `https://maps.apple.com/?q=${query}`
    : `https://www.google.com/maps/search/?api=1&query=${query}`;
}

export interface RoutePoint {
  readonly name: string;
  readonly address: string | null;
  readonly latitude: number | null;
  readonly longitude: number | null;
}

function pointQuery(point: RoutePoint): string {
  if (point.latitude !== null && point.longitude !== null)
    return `${point.latitude},${point.longitude}`;
  return point.address ? `${point.name}, ${point.address}` : point.name;
}

/** Walking directions through `points` in order; needs at least two. */
export function routeHref(points: readonly RoutePoint[], apple: boolean) {
  const [origin, ...rest] = points.map(pointQuery);
  const destination = rest.pop();
  const params = new URLSearchParams();
  if (apple) {
    params.set("source", origin ?? "");
    for (const waypoint of rest) params.append("waypoint", waypoint);
    params.set("destination", destination ?? "");
    params.set("mode", "walking");
    return `https://maps.apple.com/directions?${params.toString()}`;
  }
  params.set("api", "1");
  params.set("origin", origin ?? "");
  params.set("destination", destination ?? "");
  if (rest.length > 0) params.set("waypoints", rest.join("|"));
  params.set("travelmode", "walking");
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}
