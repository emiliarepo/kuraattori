import { type Metadata } from "next";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import Link from "next/link";

import { ExhibitionListClient } from "~/app/_components/ExhibitionListClient";
import { FilterSheet } from "~/app/_components/FilterSheet";
import {
  browseFiltersToListInput,
  browseFiltersToParams,
  regionsForBrowse,
  parseBrowseFilters,
} from "~/app/_lib/browse-filters";
import { listAcrossRegionsPages } from "~/app/_lib/list-across-regions";
import { todayInHelsinki } from "~/domain/dates";
import { t } from "~/i18n/fi";
import { auth } from "~/server/auth";
import { getActiveRegions } from "~/server/regions-preference";
import { api } from "~/trpc/server";

export const metadata: Metadata = {
  title: `${t.pages.browse.title} — ${t.app.name}`,
  description: t.pages.meta.browse,
};

const PAGE_SIZE = 20;

/** The Playwright server sets `E2E_BROWSE_PAGE_SIZE` so its small fixture set still pages. */
async function browsePageSize(): Promise<number> {
  const { env } = await getCloudflareContext({ async: true });
  const override = Number(
    (env as { E2E_BROWSE_PAGE_SIZE?: string }).E2E_BROWSE_PAGE_SIZE,
  );
  return override > 0 ? override : PAGE_SIZE;
}

export default async function ExhibitionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filters = parseBrowseFilters(await searchParams);
  const today = todayInHelsinki();

  // Filter metadata is secondary to the list itself: each falls back
  // independently rather than sinking the whole page. Already logged by the
  // tRPC error-logging middleware.
  const [activeRegions, museums, categories, showMuseumCardFilter, session] =
    await Promise.all([
      getActiveRegions(),
      api.museum.list().catch(() => []),
      api.category.list().catch(() => []),
      api.meta.hasIneligibleExhibitions().catch(() => false),
      auth(),
    ]);
  const signedIn = Boolean(session?.user);

  const listInputBase = {
    ...browseFiltersToListInput(filters),
    limit: await browsePageSize(),
  };
  const { items, nextCursor } = await listAcrossRegionsPages(
    regionsForBrowse(filters, activeRegions),
    listInputBase,
    filters.page,
  );
  const loadMoreHref = nextCursor
    ? `/exhibitions?${browseFiltersToParams({ ...filters, page: filters.page + 1 }).toString()}`
    : null;

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
          items={items}
          loadMoreHref={loadMoreHref}
          today={today}
          emptyMessage={t.pages.browse.empty}
          signedIn={signedIn}
        />
      </div>
    </div>
  );
}
