import { timeBarProps, imageAlt } from "~/app/_lib/exhibition-format";
import { type Category } from "~/app/_components/CategoryList";
import { type ExhibitionStatus } from "~/app/_components/StatusActions";
import { type TimeBarProps } from "~/app/_components/TimeBar";
import type { Venue } from "~/server/api/grouping";
import type { RouterOutputs } from "~/trpc/react";

/** Museum names joined with ", ": the grouped card/row byline, city appended by the caller. */
function venueNames(venues: readonly Venue[]): string {
  return venues.map((venue) => venue.name).join(", ");
}

export type ExhibitionWithDetails = NonNullable<
  RouterOutputs["exhibition"]["bySlug"]
>;

export interface ExhibitionRowView {
  href: string;
  title: string;
  museum: string;
  city: string;
  imageUrl: string | null;
  imageAlt: string;
  categories: Category[];
  timeBar: TimeBarProps;
  status: ExhibitionStatus | null;
  whyLabel: string | null;
}

/** No hrefs: ExhibitionRow's whole row is already a link, and links can't nest. */
function categoryLabels(
  categories: ExhibitionWithDetails["categories"],
): Category[] {
  return categories.map((category) => ({ label: category.name }));
}

export function toRowView(
  item: ExhibitionWithDetails,
  today: string,
): ExhibitionRowView {
  return {
    href: `/exhibitions/${item.slug}`,
    title: item.titleFi,
    museum: venueNames(item.venues),
    city: item.museum.city ?? "",
    imageUrl: item.imageUrl,
    imageAlt: imageAlt(item.titleFi, item.museum.name),
    categories: categoryLabels(item.categories),
    timeBar: timeBarProps(item, today),
    status: item.status,
    whyLabel: null,
  };
}

/** `recommendation.forYou` doesn't join categories or user state (ineligible exhibitions are excluded already). */
export function forYouToRowView(
  item: RouterOutputs["recommendation"]["forYou"][number],
  today: string,
): ExhibitionRowView {
  return {
    href: `/exhibitions/${item.exhibition.slug}`,
    title: item.exhibition.titleFi,
    museum: venueNames(item.venues),
    city: item.museum.city ?? "",
    imageUrl: item.exhibition.imageUrl,
    imageAlt: imageAlt(item.exhibition.titleFi, item.museum.name),
    categories: [],
    timeBar: timeBarProps(item.exhibition, today),
    status: null,
    whyLabel: item.reasons.length > 0 ? item.reasons.join(" · ") : null,
  };
}
