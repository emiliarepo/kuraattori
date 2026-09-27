import { type Metadata } from "next";
import { getCloudflareContext } from "@opennextjs/cloudflare";

import { ExhibitionListClient } from "~/app/_components/ExhibitionListClient";
import { FilterSheet, type FilterOption } from "~/app/_components/FilterSheet";
import {
  browseFiltersToListInput,
  browseFiltersToParams,
  regionsForBrowse,
  parseBrowseFilters,
} from "~/app/_lib/browse-filters";
import { listAcrossRegionsPages } from "~/app/_lib/list-across-regions";
import { todayInHelsinki } from "~/domain/dates";
import { localized, type Translatable } from "~/domain/localized";
import { INTL_LOCALE, type Locale } from "~/i18n/locales";
import { getI18n } from "~/i18n/server";
import { auth } from "~/server/auth";
import { getActiveRegions } from "~/server/regions-preference";
import { api } from "~/trpc/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return {
    title: `${t.pages.browse.title} — ${t.app.name}`,
    description: t.pages.meta.browse,
  };
}

const PAGE_SIZE = 20;

/** The Playwright server sets `E2E_BROWSE_PAGE_SIZE` so its small fixture set still pages. */
async function browsePageSize(): Promise<number> {
  const { env } = await getCloudflareContext({ async: true });
  const override = Number(
    (env as { E2E_BROWSE_PAGE_SIZE?: string }).E2E_BROWSE_PAGE_SIZE,
  );
  return override > 0 ? override : PAGE_SIZE;
}

function filterOptions(
  rows: readonly ({ id: number } & Translatable<"name">)[],
  locale: Locale,
): FilterOption[] {
  const collator = new Intl.Collator(INTL_LOCALE[locale]);
  return rows
    .map((row) => {
      const name = localized(row, "name", locale);
      return { id: row.id, label: name.text, lang: name.lang };
    })
    .sort((a, b) => collator.compare(a.label, b.label));
}

export default async function ExhibitionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { t, locale } = await getI18n();
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
      <h1 className="text-headline mb-6 text-4xl sm:col-span-2 sm:text-5xl">
        {t.pages.browse.title}
      </h1>
      <aside className="mb-4 sm:sticky sm:top-6 sm:mb-0">
        <FilterSheet
          filters={filters}
          cities={cities}
          museums={filterOptions(museums, locale)}
          categories={filterOptions(categories, locale)}
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
