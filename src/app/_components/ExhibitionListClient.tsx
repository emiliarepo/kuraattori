"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { ExhibitionList } from "~/app/_components/ExhibitionList";
import { toRowView, type ExhibitionWithDetails } from "~/app/_lib/row";
import { t } from "~/i18n/fi";

/**
 * The loaded-pages count lives in `loadMoreHref`'s `page` param (see
 * exhibitions/page.tsx), not client state: "Näytä lisää" replaces the URL
 * with the next page number so back navigation and a reload both land on
 * the same set of loaded rows, instead of resetting to page 1.
 */
export function ExhibitionListClient({
  items,
  loadMoreHref,
  today,
  emptyMessage,
  signedIn = false,
}: {
  items: readonly ExhibitionWithDetails[];
  loadMoreHref: string | null;
  today: string;
  emptyMessage: string;
  signedIn?: boolean;
}) {
  const router = useRouter();
  const [loading, startTransition] = useTransition();

  function loadMore() {
    if (!loadMoreHref) return;
    // Keep scroll in place and reuse the same history entry: repeated
    // "Näytä lisää" clicks shouldn't stack up back-button stops.
    startTransition(() => router.replace(loadMoreHref, { scroll: false }));
  }

  return (
    <div>
      <ExhibitionList
        items={items.map((item) => toRowView(item, today))}
        emptyMessage={emptyMessage}
        signedIn={signedIn}
      />
      {loadMoreHref && (
        <button
          type="button"
          onClick={loadMore}
          disabled={loading}
          className="border-rule hover:bg-surface mt-6 w-full border py-3 font-sans text-sm font-semibold disabled:opacity-60"
        >
          {loading ? t.pages.browse.loading : t.pages.browse.loadMore}
        </button>
      )}
    </div>
  );
}
