"use client";

import { usePathname, useRouter } from "next/navigation";
import { useRef, type FormEvent } from "react";

import {
  browseFiltersToParams,
  ENDING_WITHIN_OPTIONS,
  parseBrowseFilters,
  type BrowseFilters,
} from "~/app/_lib/browse-filters";
import { t } from "~/i18n/fi";

export type FilterOption = { id: number; label: string };

function toFormValue(value: FormDataEntryValue | null): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function toFormValueList(values: FormDataEntryValue[]): string {
  return values
    .filter((value): value is string => typeof value === "string")
    .join(",");
}

function FilterFields({
  filters,
  cities,
  museums,
  categories,
  showMuseumCardFilter,
}: {
  filters: BrowseFilters;
  cities: readonly string[];
  museums: readonly FilterOption[];
  categories: readonly FilterOption[];
  showMuseumCardFilter: boolean;
}) {
  return (
    <div className="flex flex-col gap-6">
      <label className="flex flex-col gap-1 text-sm font-semibold">
        {t.pages.browse.search}
        <input
          type="search"
          name="q"
          defaultValue={filters.search ?? ""}
          placeholder={t.pages.browse.searchPlaceholder}
          className="border-rule border px-2 py-1 text-sm font-normal"
        />
      </label>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-semibold">
          {t.pages.browse.state}
        </legend>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="state"
            value="current"
            defaultChecked={filters.state === "current"}
            className="accent-fg h-4 w-4"
          />
          {t.pages.browse.stateCurrent}
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="state"
            value="upcoming"
            defaultChecked={filters.state === "upcoming"}
            className="accent-fg h-4 w-4"
          />
          {t.pages.browse.stateUpcoming}
        </label>
      </fieldset>

      <label className="flex flex-col gap-1 text-sm font-semibold">
        {t.pages.browse.city}
        <select
          name="city"
          defaultValue={filters.city ?? ""}
          className="border-rule border px-2 py-1 text-sm font-normal"
        >
          <option value="">{t.pages.browse.allCities}</option>
          {cities.map((city) => (
            <option key={city} value={city}>
              {city}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm font-semibold">
        {t.pages.browse.endingWithin}
        <select
          name="ending"
          defaultValue={filters.endingWithinDays?.toString() ?? ""}
          className="border-rule border px-2 py-1 text-sm font-normal"
        >
          <option value="">{t.pages.browse.endingWithinAny}</option>
          {ENDING_WITHIN_OPTIONS.map((days) => (
            <option key={days} value={days}>
              {t.pages.browse.endingWithinDays(days)}
            </option>
          ))}
        </select>
      </label>

      {showMuseumCardFilter && (
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            name="card"
            value="1"
            defaultChecked={filters.museumCardOnly}
            className="accent-fg h-4 w-4"
          />
          {t.pages.browse.museumCardOnly}
        </label>
      )}

      {museums.length > 0 && (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-semibold">
            {t.pages.browse.museums}
          </legend>
          <div className="flex max-h-48 flex-col gap-2 overflow-y-auto">
            {museums.map((museum) => (
              <label
                key={museum.id}
                className="flex items-center gap-2 text-sm"
              >
                <input
                  type="checkbox"
                  name="museum"
                  value={museum.id}
                  defaultChecked={filters.museumIds.includes(museum.id)}
                  className="accent-fg h-4 w-4"
                />
                {museum.label}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {categories.length > 0 && (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-semibold">
            {t.pages.browse.categories}
          </legend>
          <div className="flex max-h-48 flex-col gap-2 overflow-y-auto">
            {categories.map((category) => (
              <label
                key={category.id}
                className="flex items-center gap-2 text-sm"
              >
                <input
                  type="checkbox"
                  name="category"
                  value={category.id}
                  defaultChecked={filters.categoryIds.includes(category.id)}
                  className="accent-fg h-4 w-4"
                />
                {category.label}
              </label>
            ))}
          </div>
        </fieldset>
      )}
    </div>
  );
}

export function FilterSheet(props: {
  filters: BrowseFilters;
  cities: readonly string[];
  museums: readonly FilterOption[];
  categories: readonly FilterOption[];
  showMuseumCardFilter: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const dialogRef = useRef<HTMLDialogElement>(null);

  function apply(next: BrowseFilters) {
    const query = browseFiltersToParams(next).toString();
    dialogRef.current?.close();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    apply(
      parseBrowseFilters({
        q: toFormValue(data.get("q")),
        city: toFormValue(data.get("city")),
        museum: toFormValueList(data.getAll("museum")),
        category: toFormValueList(data.getAll("category")),
        card: toFormValue(data.get("card")),
        state: toFormValue(data.get("state")),
        ending: toFormValue(data.get("ending")),
      }),
    );
  }

  function handleReset() {
    apply(parseBrowseFilters({}));
  }

  return (
    <>
      <div className="hidden sm:block">
        <h2 className="text-headline mb-4 text-xl">{t.pages.browse.filters}</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <FilterFields {...props} />
          <div className="flex flex-col gap-2">
            <button
              type="submit"
              className="bg-fg text-bg py-2 text-sm font-semibold"
            >
              {t.pages.browse.applyFilters}
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="text-muted hover:text-fg py-1 text-sm underline"
            >
              {t.pages.browse.resetFilters}
            </button>
          </div>
        </form>
      </div>

      <div className="sm:hidden">
        <button
          type="button"
          onClick={() => dialogRef.current?.showModal()}
          className="border-rule w-full border py-2 text-sm font-semibold"
        >
          {t.pages.browse.openFilters}
        </button>
        <dialog
          ref={dialogRef}
          aria-label={t.pages.browse.filters}
          className="border-rule fixed inset-x-0 bottom-0 m-0 max-h-[85vh] w-full max-w-none overflow-y-auto border-t p-4 backdrop:bg-black/40"
        >
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <h2 className="text-headline text-xl">{t.pages.browse.filters}</h2>
            <FilterFields {...props} />
            <div className="flex flex-col gap-2">
              <button
                type="submit"
                className="bg-fg text-bg py-2 text-sm font-semibold"
              >
                {t.pages.browse.applyFilters}
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="text-muted hover:text-fg py-1 text-sm underline"
              >
                {t.pages.browse.resetFilters}
              </button>
              <button
                type="button"
                onClick={() => dialogRef.current?.close()}
                className="py-1 text-sm font-semibold underline"
              >
                {t.pages.browse.closeFilters}
              </button>
            </div>
          </form>
        </dialog>
      </div>
    </>
  );
}
