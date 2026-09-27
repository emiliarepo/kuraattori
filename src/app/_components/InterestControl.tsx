"use client";

import { t } from "~/i18n/fi";

export type InterestWeight = -1 | 1 | 2;

const OPTIONS: readonly {
  weight: InterestWeight | null;
  label: string;
  icon: string;
}[] = [
  { weight: null, label: t.ui.interest.none, icon: "–" },
  { weight: 1, label: t.ui.interest.interested, icon: "●" },
  { weight: 2, label: t.ui.interest.strong, icon: "★" },
  { weight: -1, label: t.ui.interest.excluded, icon: "✕" },
];

export function InterestControl({
  categoryName,
  value,
  onChange,
}: {
  categoryName: string;
  value: InterestWeight | null;
  onChange: (weight: InterestWeight | null) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={categoryName}
      className="border-rule flex border font-sans"
    >
      {OPTIONS.map((option, index) => {
        const selected = option.weight === value;
        return (
          <button
            key={option.label}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.weight)}
            className={`border-rule flex-1 px-2.5 py-2 text-sm font-semibold transition-colors duration-150 ${
              index > 0 ? "border-l" : ""
            } ${selected ? "bg-signal text-on-signal" : "hover:bg-surface"}`}
          >
            <span aria-hidden="true" className="sm:hidden">
              {option.icon}
            </span>
            <span className="hidden sm:inline">{option.label}</span>
            <span className="sr-only sm:hidden">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
