"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";

import { persistRegionsCookie } from "~/app/_components/region-cookie-action";
import { refreshHeaderData } from "~/app/_components/refresh-header-action";
import { useBackToClose } from "~/app/_lib/use-back-to-close";
import { groupRegions } from "~/domain/regions";
import { t } from "~/i18n/fi";
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
  const [open, setOpen] = useState(false);
  useBackToClose(open, () => setOpen(false));
  const [selected, setSelected] = useState<readonly string[]>(initialSelected);
  const panelId = useId();
  const groups = groupRegions(allRegions);
  const router = useRouter();
  const updateRegions = api.profile.updateRegions.useMutation();

  const summary =
    selected.length > 0 ? selected.join(", ") : t.ui.region.allRegions;

  async function syncHeader() {
    await refreshHeaderData();
    router.refresh();
  }

  function toggle(region: string) {
    const next = selected.includes(region)
      ? selected.filter((selectedRegion) => selectedRegion !== region)
      : [...selected, region];
    setSelected(next);
    if (isSignedIn) {
      updateRegions.mutate(
        { regions: next },
        { onSuccess: () => void syncHeader() },
      );
    } else {
      void persistRegionsCookie(next).then(() => router.refresh());
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="hover:text-signal text-right font-sans text-xs font-semibold"
      >
        {summary} <span aria-hidden>▾</span>
      </button>
      {open && (
        <>
          <button
            type="button"
            aria-label="Sulje"
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
            className="border-rule bg-bg fixed inset-x-0 bottom-0 z-20 flex max-h-[85dvh] flex-col border-t p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:absolute sm:top-full sm:right-0 sm:bottom-auto sm:mt-2 sm:max-h-[70vh] sm:w-64 sm:border sm:pb-4"
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
                    className={`flex flex-col gap-2 ${index > 0 ? "border-rule-soft mt-3 border-t pt-3" : ""}`}
                  >
                    {group.map((region) => (
                      <li key={region}>
                        <label className="flex items-center gap-2 py-0.5">
                          <input
                            type="checkbox"
                            checked={selected.includes(region)}
                            onChange={() => toggle(region)}
                            className="accent-signal h-4 w-4"
                          />
                          {region}
                        </label>
                      </li>
                    ))}
                  </ul>
                ))}
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="bg-fg text-bg mt-4 w-full py-2.5 font-sans text-sm font-semibold"
            >
              {t.ui.region.apply}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
