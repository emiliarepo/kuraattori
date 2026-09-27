import { type YearReviewVisit } from "~/domain/year-review";
import type { RouterOutputs } from "~/trpc/react";

type MyListItem = RouterOutputs["my"]["list"][number];

export function toYearReviewVisits(
  items: readonly MyListItem[],
): YearReviewVisit[] {
  return items.flatMap((item) =>
    item.visitedAt
      ? [
          {
            title: item.titleFi,
            museumId: item.museum.id,
            museumName: item.museum.name,
            city: item.museum.city,
            visitedAt: item.visitedAt,
            categories: item.categories.map((category) => category.name),
          },
        ]
      : [],
  );
}
