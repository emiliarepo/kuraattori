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
      <p className="text-sm leading-relaxed whitespace-pre-line">{shown}</p>
      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="mt-2 text-sm font-semibold underline-offset-2 hover:underline"
        >
          {expanded ? t.pages.detail.showLess : t.pages.detail.showMore}
        </button>
      )}
    </div>
  );
}
