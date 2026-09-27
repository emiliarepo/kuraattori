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
