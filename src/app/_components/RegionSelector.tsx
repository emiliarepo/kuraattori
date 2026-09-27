"use client";

import { useRouter } from "next/navigation";
import { INTL_LOCALE } from "~/i18n/locales";
import { useEffect, useId, useRef, useState } from "react";

import { usePendingNavigation } from "~/app/_components/PendingNavigation";
import { persistRegionsCookie } from "~/app/_components/region-cookie-action";
import { refreshHeaderData } from "~/app/_components/refresh-header-action";
import { useBackToClose } from "~/app/_lib/use-back-to-close";
import { groupRegions } from "~/domain/regions";
import { useI18n } from "~/i18n/client";
import { api } from "~/trpc/react";

/**
 * For signed-in users, selection persists to `user_regions`; for anonymous
 * users, to a cookie. See `docs/design.md`'s RegionSelector entry.
 */
export function RegionSelector({
  allRegions,
  initialSelected,
  isSignedIn,
}: {
  allRegions: readonly string[];
  initialSelected: readonly string[];
  isSignedIn: boolean;
}) {
  const { t, locale } = useI18n();
  const [open, setOpen] = useState(false);
  useBackToClose(open, () => setOpen(false));
  const [selected, setSelected] = useState<readonly string[]>(initialSelected);
  const initialKey = initialSelected.join(",");
  const [syncedKey, setSyncedKey] = useState(initialKey);
  if (syncedKey !== initialKey) {
    setSyncedKey(initialKey);
    setSelected(initialSelected);
  }
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    function closeOnOutside(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", closeOnOutside);
    return () => document.removeEventListener("pointerdown", closeOnOutside);
  }, [open]);
  const groups = groupRegions(allRegions, t.regionName, INTL_LOCALE[locale]);
  const router = useRouter();
  const updateRegions = api.profile.updateRegions.useMutation();
  const { pending, start } = usePendingNavigation();

  const summary =
    selected.length === 0
      ? t.ui.region.allRegions
      : selected.length === 1
        ? t.regionName(selected[0]!)
        : t.ui.region.regionCount(selected.length);

  function toggle(region: string) {
    const next = selected.includes(region)
      ? selected.filter((selectedRegion) => selectedRegion !== region)
      : [...selected, region];
    setSelected(next);
    start(async () => {
      try {
        if (isSignedIn) {
          await updateRegions.mutateAsync({ regions: next });
          await refreshHeaderData();
        } else {
          await persistRegionsCookie(next);
        }
      } catch {
        // Already logged by the tRPC error-logging middleware; the refresh
        // below shows the saved state.
      }
      router.refresh();
    });
  }

  return (
    <div ref={rootRef} className="relative min-w-0">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        title={selected.length > 1 ? selected.join(", ") : summary}
        className="hover:text-signal -my-3.5 flex min-h-11 max-w-56 items-center gap-1 font-sans text-xs font-semibold"
      >
        <span className="truncate">{pending ? t.ui.updating : summary}</span>
        <span aria-hidden>▾</span>
      </button>
      {open && (
        <>
          <button
            type="button"
            aria-label={t.pages.browse.closeFilters}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-10 sm:hidden"
          />
          <div
            id={panelId}
            role="dialog"
            aria-label={t.ui.region.sheetTitle}
            onKeyDown={(event) => {
              if (event.key === "Escape") setOpen(false);
            }}
            className="border-rule bg-bg fixed inset-x-0 bottom-0 z-20 flex max-h-[85dvh] flex-col border-t p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:absolute sm:top-full sm:right-0 sm:bottom-auto sm:left-auto sm:mt-2 sm:max-h-[70vh] sm:w-64 sm:border sm:pb-4"
          >
            <p className="text-headline mb-3 text-xl">
              {t.ui.region.sheetTitle}
            </p>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              {[groups.cities, groups.others]
                .filter((group) => group.length > 0)
                .map((group, index) => (
                  <ul
                    key={index}
                    className={`flex flex-col ${index > 0 ? "border-rule-soft mt-3 border-t pt-3" : ""}`}
                  >
                    {group.map((region) => (
                      <li key={region}>
                        <label className="flex min-h-11 items-center gap-2 sm:min-h-8">
                          <input
                            type="checkbox"
                            checked={selected.includes(region)}
                            onChange={() => toggle(region)}
                            className="accent-signal h-4 w-4"
                          />
                          {t.regionName(region)}
                        </label>
                      </li>
                    ))}
                  </ul>
                ))}
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="btn btn-primary mt-4 w-full"
            >
              {t.ui.region.apply}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
