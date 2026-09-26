"use client";

import { useState } from "react";

import { t } from "~/i18n/fi";

export type ExhibitionStatus = "interested" | "visited" | "hidden";

const STATUS_ORDER: readonly ExhibitionStatus[] = [
  "interested",
  "visited",
  "hidden",
];

const STATUS_LABEL: Record<ExhibitionStatus, string> = {
  interested: t.ui.status.interested,
  visited: t.ui.status.visited,
  hidden: t.ui.status.hidden,
};

export function StatusActions({
  status,
  onChange,
}: {
  status: ExhibitionStatus | null;
  onChange: (status: ExhibitionStatus | null) => void;
}) {
  const [announcement, setAnnouncement] = useState("");

  function handleClick(value: ExhibitionStatus) {
    const next = status === value ? null : value;
    setAnnouncement(
      next
        ? t.ui.status.announceSet(STATUS_LABEL[next])
        : t.ui.status.announceCleared,
    );
    onChange(next);
  }

  return (
    <div>
      <div role="group" className="border-rule flex border">
        {STATUS_ORDER.map((value, index) => {
          const pressed = status === value;
          return (
            <button
              key={value}
              type="button"
              aria-pressed={pressed}
              onClick={() => handleClick(value)}
              className={`border-rule flex-1 px-3 py-2 text-sm font-semibold transition-colors duration-150 ${
                index > 0 ? "border-l" : ""
              } ${pressed ? "bg-fg text-bg" : "hover:bg-surface"}`}
            >
              {STATUS_LABEL[value]}
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
