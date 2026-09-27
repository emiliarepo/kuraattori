import {
  timeBarProps,
  imageAlt,
  tripWhyLabel,
} from "~/app/_lib/exhibition-format";
import { type Category } from "~/app/_components/CategoryList";
import { type ExhibitionStatus } from "~/app/_components/StatusActions";
import { type TimeBarProps } from "~/app/_components/TimeBar";
import { imageSources } from "~/domain/images";
import { localized, type LocalizedText } from "~/domain/localized";
import { type VisitRating } from "~/domain/rating-nudges";
import type { I18n } from "~/i18n";
import type { Locale } from "~/i18n/locales";
import type { Venue } from "~/server/api/grouping";
import type { RouterOutputs } from "~/trpc/react";

/**
 * Museum names joined with ", ": the grouped card/row byline, city appended
 * by the caller. Marked Finnish only when every name fell back to Finnish.
 */
function venueNames(venues: readonly Venue[], locale: Locale): LocalizedText {
  const names = venues.map((venue) => localized(venue, "name", locale));
  return {
    text: names.map((name) => name.text).join(", "),
    lang: names.every((name) => name.lang === "fi") ? "fi" : undefined,
  };
}

export type ExhibitionWithDetails = NonNullable<
  RouterOutputs["exhibition"]["bySlug"]
>;

export interface ExhibitionRowView {
  exhibitionId: number;
  href: string;
  title: LocalizedText;
  museum: LocalizedText;
  city: string;
  imageSources: string[];
  imageAlt: string;
  categories: Category[];
  timeBar: TimeBarProps;
  status: ExhibitionStatus | null;
  whyLabel: string | null;
  visitedAt: Date | null;
  visitNote: string | null;
  rating: VisitRating | null;
}

/** No hrefs: ExhibitionRow's whole row is already a link, and links can't nest. */
function categoryLabels(
  categories: ExhibitionWithDetails["categories"],
  locale: Locale,
): Category[] {
  return categories.map((category) => {
    const name = localized(category, "name", locale);
    return { label: name.text, lang: name.lang };
  });
}

export function toRowView(
  item: ExhibitionWithDetails,
  today: string,
  i18n: I18n,
): ExhibitionRowView {
  const title = localized(item, "title", i18n.locale);
  return {
    exhibitionId: item.id,
    href: `/exhibitions/${item.slug}`,
    title,
    museum: venueNames(item.venues, i18n.locale),
    city: item.museum.city ?? "",
    imageSources: imageSources(item, today),
    imageAlt: imageAlt(
      title.text,
      localized(item.museum, "name", i18n.locale).text,
    ),
    categories: categoryLabels(item.categories, i18n.locale),
    timeBar: timeBarProps(item, today, i18n),
    status: item.status,
    whyLabel: null,
    visitedAt: item.visitedAt,
    visitNote: item.visitNote,
    rating: item.rating,
  };
}

/**
 * Trip mode's row: same shape as `toRowView`, with the why-slot set to the
 * trip's overlap reason. Ending-soon rows get the TimeBar's urgent state even
 * when the trip is further away than the TimeBar's own window.
 */
export function tripToRowView(
  item: ExhibitionWithDetails,
  today: string,
  from: string,
  to: string,
  endingSoon: boolean,
  i18n: I18n,
): ExhibitionRowView {
  const row = toRowView(item, today, i18n);
  return {
    ...row,
    timeBar: endingSoon ? { ...row.timeBar, urgent: true } : row.timeBar,
    whyLabel: tripWhyLabel(item, from, to, i18n, endingSoon),
  };
}

/** `recommendation.forYou` doesn't join categories or user state (ineligible exhibitions are excluded already). */
export function forYouToRowView(
  item: RouterOutputs["recommendation"]["forYou"][number],
  today: string,
  i18n: I18n,
): ExhibitionRowView {
  const title = localized(item.exhibition, "title", i18n.locale);
  return {
    exhibitionId: item.exhibition.id,
    href: `/exhibitions/${item.exhibition.slug}`,
    title,
    museum: venueNames(item.venues, i18n.locale),
    city: item.museum.city ?? "",
    imageSources: imageSources(item.exhibition, today),
    imageAlt: imageAlt(
      title.text,
      localized(item.museum, "name", i18n.locale).text,
    ),
    categories: [],
    timeBar: timeBarProps(item.exhibition, today, i18n),
    status: null,
    whyLabel: item.reasons.length > 0 ? item.reasons.join(" · ") : null,
    visitedAt: null,
    visitNote: null,
    rating: null,
  };
}
