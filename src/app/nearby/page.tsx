import { type Metadata } from "next";

import { groupRegions } from "~/domain/regions";
import { NEARBY_RADII_KM } from "~/domain/nearby";
import { INTL_LOCALE } from "~/i18n/locales";
import { getI18n } from "~/i18n/server";
import { api } from "~/trpc/server";
import { NearbyFinder } from "./NearbyFinder";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.pages.nearby.title };
}

export default async function NearbyPage({
  searchParams,
}: {
  searchParams: Promise<{ city?: string; km?: string }>;
}) {
  const [{ t, locale }, params, cities] = await Promise.all([
    getI18n(),
    searchParams,
    api.nearby.cities().catch(() => []),
  ]);
  const collator = new Intl.Collator("fi-FI");
  const byRegion = new Map<string, string[]>();
  for (const { city, region } of cities) {
    const key = region ?? city;
    byRegion.set(key, [...(byRegion.get(key) ?? []), city]);
  }
  const { cities: cityRegions, others } = groupRegions(
    [...byRegion.keys()],
    t.regionName,
    INTL_LOCALE[locale],
  );
  const cityGroups = [...cityRegions, ...others].map((region) => ({
    region: t.regionName(region),
    cities: byRegion.get(region)!.sort(collator.compare),
  }));
  const km = NEARBY_RADII_KM.find((radius) => String(radius) === params.km);
  const knownCity = cities.some(({ city }) => city === params.city)
    ? params.city
    : undefined;

  return (
    <div className="py-8">
      <h1 className="text-headline text-4xl sm:text-5xl">
        {t.pages.nearby.title}
      </h1>
      <p className="text-muted mt-2 mb-6 italic">{t.pages.nearby.intro}</p>
      <NearbyFinder
        cityGroups={cityGroups}
        initialCity={knownCity}
        initialRadius={km ?? 2}
      />
    </div>
  );
}
