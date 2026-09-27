"use client";

import { useI18n } from "~/i18n/client";

export default function ErrorBoundary({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col items-start gap-4 py-8">
      <h1 className="text-headline text-4xl sm:text-5xl">
        {t.pages.error.title}
      </h1>
      <p className="text-muted text-lg italic">{t.pages.error.body}</p>
      <button type="button" onClick={reset} className="btn btn-primary">
        {t.pages.error.retry}
      </button>
    </div>
  );
}
