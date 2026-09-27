"use client";

import { t } from "~/i18n/fi";

export default function ErrorBoundary({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-start gap-4 py-16">
      <h1 className="text-headline text-4xl">{t.pages.error.title}</h1>
      <p className="text-muted">{t.pages.error.body}</p>
      <button
        type="button"
        onClick={reset}
        className="bg-fg text-bg px-4 py-2 text-sm font-semibold"
      >
        {t.pages.error.retry}
      </button>
    </div>
  );
}
