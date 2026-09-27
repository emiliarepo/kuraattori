import Link from "next/link";

import { CategoryList } from "~/app/_components/CategoryList";
import { ImageFallback } from "~/app/_components/ImageFallback";
import { STATUS_LABEL } from "~/app/_components/StatusActions";
import { TimeBar } from "~/app/_components/TimeBar";
import { type ExhibitionRowView } from "~/app/_lib/row";

/**
 * Fixed line budget so every card in a rail lines up: kicker 1 line, title 2,
 * byline 1, categories 1, then the time block pinned to the bottom.
 */
export function ExhibitionCard({
  item,
  lead,
}: {
  item: ExhibitionRowView;
  lead?: React.ReactNode;
}) {
  const kicker = [item.status && STATUS_LABEL[item.status], item.whyLabel]
    .filter(Boolean)
    .join(" · ");

  return (
    <Link
      href={item.href}
      className="group flex h-full w-full flex-col gap-1.5"
    >
      <ImageFallback
        src={item.imageUrl}
        alt={item.imageAlt}
        title={item.title}
        aspectRatio="4 / 5"
      />
      {lead}
      <p className="text-kicker text-signal mt-0.5 min-h-[1lh] truncate">
        {kicker}
      </p>
      <p
        title={item.title}
        className="line-clamp-2 min-h-[2lh] text-base leading-tight font-medium group-hover:underline group-hover:decoration-1 group-hover:underline-offset-4 sm:text-lg sm:leading-tight"
      >
        {item.title}
      </p>
      <p className="text-muted truncate font-sans text-xs leading-snug">
        {item.museum}
        {item.city && `, ${item.city}`}
      </p>
      {item.categories.length > 0 ? (
        <CategoryList
          categories={item.categories}
          className="truncate leading-snug"
        />
      ) : (
        <p aria-hidden className="font-sans text-xs leading-snug">
          {"\u00a0"}
        </p>
      )}
      {!lead && (
        <div className="mt-auto pt-1">
          <TimeBar {...item.timeBar} stacked />
        </div>
      )}
    </Link>
  );
}
