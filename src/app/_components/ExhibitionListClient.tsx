"use client";

import { useState } from "react";

import { ExhibitionList } from "~/app/_components/ExhibitionList";
import { toRowView, type ExhibitionWithDetails } from "~/app/_lib/row";
import { t } from "~/i18n/fi";
import { api, type RouterInputs } from "~/trpc/react";

type ListInput = Omit<RouterInputs["exhibition"]["list"], "cursor">;

export function ExhibitionListClient({
  initialItems,
  initialNextCursor,
  input,
  today,
  emptyMessage,
}: {
  initialItems: readonly ExhibitionWithDetails[];
  initialNextCursor: string | null;
  input: ListInput;
  today: string;
  emptyMessage: string;
}) {
  const utils = api.useUtils();
  const [items, setItems] = useState(initialItems);
  const [cursor, setCursor] = useState(initialNextCursor);
  const [loading, setLoading] = useState(false);

  async function loadMore() {
    if (!cursor || loading) return;
    setLoading(true);
    try {
      const page = await utils.client.exhibition.list.query({
        ...input,
        cursor,
      });
      setItems((prev) => [...prev, ...page.items]);
      setCursor(page.nextCursor);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <ExhibitionList
        items={items.map((item) => toRowView(item, today))}
        emptyMessage={emptyMessage}
      />
      {cursor && (
        <button
          type="button"
          onClick={loadMore}
          disabled={loading}
          className="border-rule hover:bg-surface mt-6 w-full border py-3 text-sm font-semibold disabled:opacity-60"
        >
          {loading ? t.pages.browse.loading : t.pages.browse.loadMore}
        </button>
      )}
    </div>
  );
}
