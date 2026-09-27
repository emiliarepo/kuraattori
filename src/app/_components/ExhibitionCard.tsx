import { HoverPrefetchLink } from "~/app/_components/HoverPrefetchLink";

import { CategoryList } from "~/app/_components/CategoryList";
import { ImageFallback } from "~/app/_components/ImageFallback";
import { StatusHeart } from "~/app/_components/StatusHeart";
import { TimeBar } from "~/app/_components/TimeBar";
import { type ExhibitionRowView } from "~/app/_lib/row";

/**
 * Text takes its natural height and the slack collects above the time block,
 * which is pinned to the bottom so it lines up across a rail. The
 * status heart sits over the image as a sibling of the link, not nested
 * inside it.
 */
export function ExhibitionCard({
  item,
  lead,
  signedIn = false,
}: {
  item: ExhibitionRowView;
  lead?: React.ReactNode;
  signedIn?: boolean;
}) {
  return (
    <div className="relative h-full w-full">
      <HoverPrefetchLink
        href={item.href}
        className="group flex h-full w-full flex-col gap-1.5"
      >
        <ImageFallback
          sources={item.imageSources}
          alt={item.imageAlt}
          title={item.title.text}
          aspectRatio="4 / 5"
        />
        {lead}
        {!lead && (
          <p className="text-kicker text-signal mt-0.5 min-h-[1lh] truncate">
            {item.whyLabel}
          </p>
        )}
        <p
          lang={item.title.lang}
          title={item.title.text}
          className="line-clamp-2 text-base leading-tight font-medium group-hover:underline group-hover:decoration-1 group-hover:underline-offset-4 sm:text-lg sm:leading-tight"
        >
          {item.title.text}
        </p>
        <p className="text-muted truncate font-sans text-xs leading-snug">
          <span lang={item.museum.lang}>{item.museum.text}</span>
          {item.city && `, ${item.city}`}
        </p>
        {item.categories.length > 0 ? (
          <CategoryList
            categories={item.categories}
            className="truncate text-xs leading-snug"
          />
        ) : (
          <p aria-hidden className="font-sans text-xs leading-snug">
            {" "}
          </p>
        )}
        {!lead && (
          <div className="mt-auto pt-1">
            <TimeBar {...item.timeBar} stacked />
          </div>
        )}
      </HoverPrefetchLink>
      {signedIn && (
        <StatusHeart
          exhibitionId={item.exhibitionId}
          title={item.title.text}
          status={item.status}
          className="absolute top-1 right-1 z-10"
        />
      )}
    </div>
  );
}
