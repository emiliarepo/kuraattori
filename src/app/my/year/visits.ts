import { localized } from "~/domain/localized";
import { type YearReviewVisit } from "~/domain/year-review";
import type { Locale } from "~/i18n/locales";
import type { RouterOutputs } from "~/trpc/react";

type MyListItem = RouterOutputs["my"]["list"][number];

export function toYearReviewVisits(
  items: readonly MyListItem[],
  locale: Locale,
): YearReviewVisit[] {
  return items.flatMap((item) =>
    item.visitedAt
      ? [
          {
            title: localized(item, "title", locale).text,
            museumId: item.museum.id,
            museumName: localized(item.museum, "name", locale).text,
            city: item.museum.city,
            visitedAt: item.visitedAt,
            categories: item.categories.map(
              (category) => localized(category, "name", locale).text,
            ),
          },
        ]
      : [],
  );
}
