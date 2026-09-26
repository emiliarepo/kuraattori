"use client";

import { useId, useState } from "react";

import { t } from "~/i18n/fi";

export type Region = { id: string; label: string; selected: boolean };

export function RegionSelector({
  regions,
  onChange,
}: {
  regions: readonly Region[];
  onChange: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  const selectedLabels = regions.filter((r) => r.selected).map((r) => r.label);
  const summary =
    selectedLabels.length > 0
      ? selectedLabels.join(", ")
      : t.ui.region.allRegions;

  function toggle(id: string) {
    const selectedIds = regions.filter((r) => r.selected).map((r) => r.id);
    const next = selectedIds.includes(id)
      ? selectedIds.filter((selectedId) => selectedId !== id)
      : [...selectedIds, id];
    onChange(next);
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="hover:text-signal text-sm font-semibold"
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
            className="border-rule bg-bg fixed inset-x-0 bottom-0 z-20 border-t p-4 sm:absolute sm:top-full sm:right-0 sm:bottom-auto sm:mt-2 sm:w-64 sm:border"
          >
            <p className="text-headline mb-3 text-lg">
              {t.ui.region.sheetTitle}
            </p>
            <ul className="flex flex-col gap-2">
              {regions.map((region) => (
                <li key={region.id}>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={region.selected}
                      onChange={() => toggle(region.id)}
                      className="accent-fg h-4 w-4"
                    />
                    {region.label}
                  </label>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="bg-fg text-bg mt-4 w-full py-2 text-sm font-semibold"
            >
              {t.ui.region.apply}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
