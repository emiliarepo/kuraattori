import { type Metadata } from "next";
import Link from "next/link";

import { ExhibitionListClient } from "~/app/_components/ExhibitionListClient";
import { FilterSheet } from "~/app/_components/FilterSheet";
import { StaleDataNotice } from "~/app/_components/StaleDataNotice";
import {
  browseFiltersToListInput,
  parseBrowseFilters,
} from "~/app/_lib/browse-filters";
import { listAcrossRegions } from "~/app/_lib/list-across-regions";
import { todayInHelsinki } from "~/domain/dates";
import { t } from "~/i18n/fi";
import { getActiveRegions } from "~/server/regions-preference";
import { api } from "~/trpc/server";

export const metadata: Metadata = {
  title: `${t.pages.browse.title} — ${t.app.name}`,
  description: t.pages.meta.browse,
};

const PAGE_SIZE = 20;

export default async function ExhibitionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filters = parseBrowseFilters(await searchParams);
  const today = todayInHelsinki();

  const [
    activeRegions,
    museums,
    categories,
    showMuseumCardFilter,
    lastImportAt,
  ] = await Promise.all([
    getActiveRegions(),
    api.museum.list(),
    api.category.list(),
    api.meta.hasIneligibleExhibitions(),
    api.meta.lastImportAt(),
  ]);

  const listInputBase = {
    ...browseFiltersToListInput(filters),
    limit: PAGE_SIZE,
  };
  const { items, nextCursor } = await listAcrossRegions(
    activeRegions,
    listInputBase,
  );
  // Mirrors listAcrossRegions' own region resolution so "load more" keeps
  // filtering by the same region it was seeded with.
  const listInput = {
    ...listInputBase,
    region: activeRegions.length === 1 ? activeRegions[0] : undefined,
  };

  const cities = [
    ...new Set(
      museums
        .map((museum) => museum.city)
        .filter((city): city is string => !!city),
    ),
  ].sort((a, b) => a.localeCompare(b, "fi"));

  return (
    <div className="py-8 sm:grid sm:grid-cols-[15rem_1fr] sm:items-start sm:gap-x-10">
      <div className="mb-6 flex items-baseline justify-between gap-4 sm:col-span-2">
        <h1 className="text-headline text-4xl sm:text-5xl">
          {t.pages.browse.title}
        </h1>
        <Link
          href="/trip"
          className="hover:text-signal font-sans text-sm underline underline-offset-4"
        >
          {t.pages.trip.entry}
        </Link>
      </div>
      <aside className="mb-4 sm:sticky sm:top-6 sm:mb-0">
        <FilterSheet
          filters={filters}
          cities={cities}
          museums={museums.map((museum) => ({
            id: museum.id,
            label: museum.name,
          }))}
          categories={categories.map((category) => ({
            id: category.id,
            label: category.name,
          }))}
          showMuseumCardFilter={showMuseumCardFilter}
        />
      </aside>
      <div>
        <ExhibitionListClient
          key={JSON.stringify(listInput)}
          initialItems={items}
          initialNextCursor={nextCursor}
          input={listInput}
          today={today}
          emptyMessage={t.pages.browse.empty}
        />
        <div className="mt-8">
          <StaleDataNotice lastImportAt={lastImportAt} />
        </div>
      </div>
    </div>
  );
}
