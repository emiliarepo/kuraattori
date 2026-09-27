import Link from "next/link";

import { CategoryList, type Category } from "~/app/_components/CategoryList";
import { ImageFallback } from "~/app/_components/ImageFallback";
import { StatusHeart } from "~/app/_components/StatusHeart";
import {
  STATUS_LABEL,
  type ExhibitionStatus,
} from "~/app/_components/StatusActions";
import { TimeBar, type TimeBarProps } from "~/app/_components/TimeBar";
import { VisitRating } from "~/app/_components/VisitRating";
import { type VisitRating as Rating } from "~/domain/rating-nudges";

export function ExhibitionRow({
  exhibitionId,
  href,
  title,
  museum,
  city,
  imageSources,
  imageAlt,
  categories,
  timeBar,
  status,
  whyLabel,
  visitedAt,
  visitNote,
  rating = null,
  signedIn = false,
  ratable = false,
}: {
  exhibitionId: number;
  href: string;
  title: string;
  museum: string;
  city: string;
  imageSources: readonly string[];
  imageAlt: string;
  categories: readonly Category[];
  timeBar: TimeBarProps;
  status?: ExhibitionStatus | null;
  whyLabel?: string | null;
  visitedAt?: Date | null;
  visitNote?: string | null;
  rating?: Rating | null;
  signedIn?: boolean;
  ratable?: boolean;
}) {
  const showRating = signedIn && ratable && status === "visited";
  const visitedLabel = visitedAt
    ? `Käyty ${new Intl.DateTimeFormat("fi-FI", { timeZone: "Europe/Helsinki", day: "numeric", month: "numeric", year: "numeric" }).format(visitedAt)}`
    : null;
  return (
    <li className="border-rule-soft border-t first:border-t-0">
      <div className="relative">
        <Link
          href={href}
          className={`group flex gap-4 sm:gap-6 ${showRating ? "pt-5 pb-2" : "py-5"}`}
        >
          <div className="w-24 flex-shrink-0 sm:w-40">
            <ImageFallback
              sources={imageSources}
              alt={imageAlt}
              title={title}
              aspectRatio="4 / 3"
            />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            {whyLabel && <p className="text-kicker text-signal">{whyLabel}</p>}
            <p
              className={`line-clamp-3 text-xl leading-tight font-medium group-hover:underline group-hover:decoration-1 group-hover:underline-offset-4 sm:text-2xl ${signedIn ? "pr-12" : ""}`}
            >
              {title}
            </p>
            <p className="text-muted leading-snug italic">
              {museum}
              {city && `, ${city}`}
            </p>
            <CategoryList categories={categories} />
            <div className="mt-1 max-w-sm">
              <TimeBar {...timeBar} />
            </div>
            {status === "visited" ? (
              <>
                <p className="text-kicker mt-0.5">{visitedLabel}</p>
                {visitNote && (
                  <p className="text-muted line-clamp-2 text-sm">{visitNote}</p>
                )}
              </>
            ) : (
              status && (
                <p className="text-kicker mt-0.5">{STATUS_LABEL[status]}</p>
              )
            )}
          </div>
        </Link>
        {signedIn && (
          <StatusHeart
            exhibitionId={exhibitionId}
            title={title}
            status={status ?? null}
            className="absolute top-5 right-0 z-10"
          />
        )}
        {showRating && (
          <div className="pb-5 pl-28 sm:pl-46">
            <VisitRating exhibitionId={exhibitionId} initialRating={rating} />
          </div>
        )}
      </div>
    </li>
  );
}
