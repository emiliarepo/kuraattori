/**
 * Product regions, per docs/design.md: Pääkaupunkiseutu (Helsinki, Espoo,
 * Vantaa, Kauniainen), Tampere and Turku stand alone; every other city maps to
 * its maakunta name as museot.fi reports it.
 */
const CITY_REGION_OVERRIDES: Readonly<Record<string, string>> = {
  Helsinki: "Pääkaupunkiseutu",
  Espoo: "Pääkaupunkiseutu",
  Vantaa: "Pääkaupunkiseutu",
  Kauniainen: "Pääkaupunkiseutu",
  Tampere: "Tampere",
  Turku: "Turku",
};

/**
 * Resolves a city to a product region. `maakuntaByCity` is built by the
 * importer from museot.fi's own maakunta_id listing filters, so the mapping
 * follows the source instead of a hardcoded municipality list.
 */
export function resolveRegion(
  city: string,
  maakuntaByCity: ReadonlyMap<string, string>,
): string | undefined {
  return CITY_REGION_OVERRIDES[city] ?? maakuntaByCity.get(city);
}

const CITY_REGIONS = ["Pääkaupunkiseutu", "Tampere", "Turku"] as const;
/**
 * Splits regions for display: the city regions in fixed order, then the rest
 * alphabetically by the name they're shown under.
 */
export function groupRegions(
  regions: readonly string[],
  displayName: (region: string) => string = (region) => region,
  intlLocale = "fi-FI",
): {
  cities: string[];
  others: string[];
} {
  const present = new Set(regions);
  const collator = new Intl.Collator(intlLocale);
  return {
    cities: CITY_REGIONS.filter((region) => present.has(region)),
    others: regions
      .filter((region) => !(CITY_REGIONS as readonly string[]).includes(region))
      .sort((a, b) => collator.compare(displayName(a), displayName(b))),
  };
}
