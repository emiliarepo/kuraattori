"use client";

import { useRouter } from "next/navigation";
import { useLayoutEffect, useRef, useTransition } from "react";

import { ExhibitionList } from "~/app/_components/ExhibitionList";
import { toRowView, type ExhibitionWithDetails } from "~/app/_lib/row";
import { useI18n } from "~/i18n/client";

// With a loading.tsx boundary above the page, production Next.js resets
// scroll and focus on this navigation despite `scroll: false`. The page
// remounts, so the position to restore has to outlive this component.
let pendingRestore: { href: string; scrollY: number } | null = null;

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
  const i18n = useI18n();
  const { t } = i18n;
  const router = useRouter();
  const [loading, startTransition] = useTransition();
  const loadMoreRef = useRef<HTMLButtonElement>(null);

  useLayoutEffect(() => {
    const restore = pendingRestore;
    if (!restore) return;
    pendingRestore = null;
    if (location.pathname + location.search !== restore.href) return;
    // Next's scroll handler runs after this layout effect in the same commit.
    queueMicrotask(() => {
      window.scrollTo(0, restore.scrollY);
      loadMoreRef.current?.focus({ preventScroll: true });
    });
  }, [items]);

  function loadMore() {
    if (!loadMoreHref) return;
    pendingRestore = { href: loadMoreHref, scrollY: window.scrollY };
    // Keep scroll in place and reuse the same history entry: repeated
    // "Näytä lisää" clicks shouldn't stack up back-button stops.
    startTransition(() => router.replace(loadMoreHref, { scroll: false }));
  }

  return (
    <div>
      <ExhibitionList
        items={items.map((item) => toRowView(item, today, i18n))}
        emptyMessage={emptyMessage}
        signedIn={signedIn}
      />
      {loadMoreHref && (
        <button
          ref={loadMoreRef}
          type="button"
          onClick={loadMore}
          disabled={loading}
          className="btn btn-secondary mt-6 w-full disabled:opacity-60"
        >
          {loading ? t.pages.browse.loading : t.pages.browse.loadMore}
        </button>
      )}
    </div>
  );
}
