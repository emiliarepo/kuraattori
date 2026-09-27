"use client";

import { useState } from "react";

import { useI18n } from "~/i18n/client";

export type ExhibitionStatus = "interested" | "visited" | "hidden";

const STATUS_ORDER: readonly ExhibitionStatus[] = [
  "interested",
  "visited",
  "hidden",
];

export function StatusActions({
  status,
  onChange,
  disabledStatuses = [],
}: {
  status: ExhibitionStatus | null;
  onChange: (status: ExhibitionStatus | null) => void;
  disabledStatuses?: readonly ExhibitionStatus[];
}) {
  const { t } = useI18n();
  const [announcement, setAnnouncement] = useState("");

  function handleClick(value: ExhibitionStatus) {
    const next = status === value ? null : value;
    setAnnouncement(
      next
        ? t.ui.status.announceSet(t.ui.status[next])
        : t.ui.status.announceCleared,
    );
    onChange(next);
  }

  return (
    <div>
      <div role="group" className="border-rule flex border font-sans">
        {STATUS_ORDER.map((value, index) => {
          const pressed = status === value;
          return (
            <button
              key={value}
              type="button"
              disabled={disabledStatuses.includes(value)}
              aria-pressed={pressed}
              onClick={() => handleClick(value)}
              className={`border-rule min-h-11 flex-1 px-3 py-2.5 text-sm font-semibold transition-colors duration-150 ${
                index > 0 ? "border-l" : ""
              } ${pressed ? "bg-signal text-on-signal" : "hover:bg-surface"} ${disabledStatuses.includes(value) ? "cursor-not-allowed opacity-50" : ""}`}
            >
              {t.ui.status[value]}
            </button>
          );
        })}
      </div>
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}
