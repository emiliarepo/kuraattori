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
