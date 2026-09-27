"use client";

import { useState } from "react";

import { t } from "~/i18n/fi";

const COLLAPSE_LENGTH = 600;

export function ExhibitionDescription({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = text.length > COLLAPSE_LENGTH;
  const shown =
    isLong && !expanded ? `${text.slice(0, COLLAPSE_LENGTH)}…` : text;

  return (
    <div>
      <p className="text-lg leading-relaxed whitespace-pre-line">{shown}</p>
      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="hover:text-signal mt-3 font-sans text-sm font-semibold underline underline-offset-4"
        >
          {expanded ? t.pages.detail.showLess : t.pages.detail.showMore}
        </button>
      )}
    </div>
  );
}
