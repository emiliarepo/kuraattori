"use client";

import { usePathname, useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";

import {
  browseFiltersToParams,
  ENDING_WITHIN_OPTIONS,
  parseBrowseFilters,
  type BrowseFilters,
} from "~/app/_lib/browse-filters";
import { usePendingNavigation } from "~/app/_components/PendingNavigation";
import { useBackToClose } from "~/app/_lib/use-back-to-close";
import { useI18n } from "~/i18n/client";

export type FilterOption = { id: number; label: string; lang?: "fi" };

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
  const { t } = useI18n();
  const [museumFilter, setMuseumFilter] = useState("");
  const normalizedMuseumFilter = museumFilter.trim().toLowerCase();

  return (
    <div className="flex flex-col gap-6 font-sans">
      <label className="text-kicker flex flex-col gap-1.5">
        {t.pages.browse.search}
        <input
          type="search"
          name="q"
          defaultValue={filters.search ?? ""}
          placeholder={t.pages.browse.searchPlaceholder}
          className="border-rule-soft bg-bg focus:border-fg min-h-11 border px-2 py-2 text-base font-normal tracking-normal normal-case"
        />
      </label>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-kicker mb-1">{t.pages.browse.state}</legend>
        <label className="flex min-h-11 shrink-0 items-center gap-2 text-sm sm:min-h-0">
          <input
            type="radio"
            name="state"
            value="current"
            defaultChecked={filters.state === "current"}
            className="accent-signal h-4 w-4 flex-none"
          />
          {t.pages.browse.stateCurrent}
        </label>
        <label className="flex min-h-11 shrink-0 items-center gap-2 text-sm sm:min-h-0">
          <input
            type="radio"
            name="state"
            value="upcoming"
            defaultChecked={filters.state === "upcoming"}
            className="accent-signal h-4 w-4 flex-none"
          />
          {t.pages.browse.stateUpcoming}
        </label>
      </fieldset>

      <label className="text-kicker flex flex-col gap-1.5">
        {t.pages.browse.city}
        <select
          name="city"
          defaultValue={filters.city ?? ""}
          className="border-rule-soft bg-bg focus:border-fg min-h-11 border px-2 py-2 text-base font-normal tracking-normal normal-case"
        >
          <option value="">{t.pages.browse.allCities}</option>
          {cities.map((city) => (
            <option key={city} value={city}>
              {city}
            </option>
          ))}
        </select>
      </label>

      <label className="text-kicker flex flex-col gap-1.5">
        {t.pages.browse.endingWithin}
        <select
          name="ending"
          defaultValue={filters.endingWithinDays?.toString() ?? ""}
          className="border-rule-soft bg-bg focus:border-fg min-h-11 border px-2 py-2 text-base font-normal tracking-normal normal-case"
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
        <label className="flex min-h-11 items-center gap-2 text-sm font-semibold sm:min-h-0">
          <input
            type="checkbox"
            name="card"
            value="1"
            defaultChecked={filters.museumCardOnly}
            className="accent-signal h-4 w-4 flex-none"
          />
          {t.pages.browse.museumCardOnly}
        </label>
      )}

      {museums.length > 0 && (
        <fieldset className="flex flex-col gap-2">
          <legend className="text-kicker mb-1">{t.pages.browse.museums}</legend>
          <input
            type="search"
            value={museumFilter}
            onChange={(event) => setMuseumFilter(event.target.value)}
            placeholder={t.pages.browse.museumFilter}
            aria-label={t.pages.browse.museumFilter}
            className="border-rule-soft bg-bg focus:border-fg min-h-11 border px-2 py-2 text-base font-normal tracking-normal normal-case"
          />
          <div className="flex max-h-48 flex-col overflow-y-auto sm:gap-2">
            {museums.map((museum) => (
              <label
                key={museum.id}
                className={
                  museum.label.toLowerCase().includes(normalizedMuseumFilter)
                    ? "flex min-h-11 shrink-0 items-center gap-2 text-sm sm:min-h-0"
                    : "hidden"
                }
              >
                <input
                  type="checkbox"
                  name="museum"
                  value={museum.id}
                  defaultChecked={filters.museumIds.includes(museum.id)}
                  className="accent-signal h-4 w-4 flex-none"
                />
                <span lang={museum.lang}>{museum.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {categories.length > 0 && (
        <fieldset className="flex flex-col gap-2">
          <legend className="text-kicker mb-1">
            {t.pages.browse.categories}
          </legend>
          <div className="flex max-h-48 flex-col overflow-y-auto sm:gap-2">
            {categories.map((category) => (
              <label
                key={category.id}
                className="flex min-h-11 shrink-0 items-center gap-2 text-sm sm:min-h-0"
              >
                <input
                  type="checkbox"
                  name="category"
                  value={category.id}
                  defaultChecked={filters.categoryIds.includes(category.id)}
                  className="accent-signal h-4 w-4 flex-none"
                />
                <span lang={category.lang}>{category.label}</span>
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
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const { pending, start } = usePendingNavigation();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const releaseHistoryEntry = useBackToClose(sheetOpen, () =>
    dialogRef.current?.close(),
  );

  const [formKey, setFormKey] = useState(0);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  function apply(next: BrowseFilters) {
    const query = browseFiltersToParams(next).toString();
    const href = query ? `${pathname}?${query}` : pathname;
    start(() => router.replace(href, { scroll: false }));
  }

  function applyForm(form: HTMLFormElement) {
    const data = new FormData(form);
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

  // Every change applies at once; typing in the search box waits for a pause.
  function handleChange(event: FormEvent<HTMLFormElement>) {
    const target = event.target as HTMLInputElement;
    if (!target.name) return;
    const form = event.currentTarget;
    clearTimeout(searchTimer.current);
    if (target.name === "q")
      searchTimer.current = setTimeout(() => applyForm(form), 350);
    else applyForm(form);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearTimeout(searchTimer.current);
    applyForm(event.currentTarget);
    if (sheetOpen) {
      releaseHistoryEntry();
      dialogRef.current?.close();
    }
  }

  function handleReset() {
    clearTimeout(searchTimer.current);
    setFormKey((key) => key + 1);
    apply(parseBrowseFilters({}));
  }

  return (
    <>
      <div className="hidden overscroll-contain sm:block sm:max-h-[calc(100dvh-3rem)] sm:overflow-y-auto sm:pr-3">
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <h2 className="text-headline text-2xl">{t.pages.browse.filters}</h2>
          <span role="status" className="text-muted font-sans text-xs">
            {pending ? t.ui.updating : ""}
          </span>
        </div>
        <form
          key={formKey}
          onSubmit={handleSubmit}
          onChange={handleChange}
          className="flex flex-col gap-6"
        >
          <FilterFields {...props} />
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={handleReset}
              className="text-muted hover:text-fg py-1 font-sans text-sm underline underline-offset-4"
            >
              {t.pages.browse.resetFilters}
            </button>
          </div>
        </form>
      </div>

      <div className="sm:hidden">
        <button
          type="button"
          onClick={() => {
            dialogRef.current?.showModal();
            setSheetOpen(true);
          }}
          className="btn btn-secondary w-full"
        >
          {pending ? t.ui.updating : t.pages.browse.openFilters}
        </button>
        <dialog
          ref={dialogRef}
          aria-label={t.pages.browse.filters}
          onClose={() => setSheetOpen(false)}
          className="border-rule bg-bg text-fg fixed inset-x-0 bottom-0 m-0 max-h-[85vh] w-full max-w-none overflow-y-auto border-t p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop:bg-black/40"
        >
          <form
            key={formKey}
            onSubmit={handleSubmit}
            onChange={handleChange}
            className="flex flex-col gap-6"
          >
            <h2 className="text-headline text-2xl">{t.pages.browse.filters}</h2>
            <FilterFields {...props} />
            <div className="bg-bg border-rule-soft sticky bottom-0 -mx-4 flex flex-col gap-2 border-t px-4 pt-3">
              <button
                type="submit"
                disabled={pending}
                className="btn btn-primary"
              >
                {pending ? t.ui.updating : t.pages.browse.applyFilters}
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="text-muted hover:text-fg py-1 font-sans text-sm underline underline-offset-4"
              >
                {t.pages.browse.resetFilters}
              </button>
              <button
                type="button"
                onClick={() => dialogRef.current?.close()}
                className="py-1 font-sans text-sm font-semibold underline underline-offset-4"
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
