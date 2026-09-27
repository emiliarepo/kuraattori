import Link from "next/link";

import { CategoryList, type Category } from "~/app/_components/CategoryList";
import { ImageFallback } from "~/app/_components/ImageFallback";
import {
  STATUS_LABEL,
  type ExhibitionStatus,
} from "~/app/_components/StatusActions";
import { TimeBar, type TimeBarProps } from "~/app/_components/TimeBar";

export function ExhibitionRow({
  href,
  title,
  museum,
  city,
  imageUrl,
  imageAlt,
  categories,
  timeBar,
  status,
  whyLabel,
  visitedAt,
  visitNote,
}: {
  href: string;
  title: string;
  museum: string;
  city: string;
  imageUrl?: string | null;
  imageAlt: string;
  categories: readonly Category[];
  timeBar: TimeBarProps;
  status?: ExhibitionStatus | null;
  whyLabel?: string | null;
  visitedAt?: Date | null;
  visitNote?: string | null;
}) {
  const visitedLabel = visitedAt
    ? `Käyty ${new Intl.DateTimeFormat("fi-FI", { timeZone: "Europe/Helsinki", day: "numeric", month: "numeric", year: "numeric" }).format(visitedAt)}`
    : null;
  return (
    <li className="border-rule-soft border-t first:border-t-0">
      <Link href={href} className="group flex gap-4 py-5 sm:gap-6">
        <div className="w-24 flex-shrink-0 sm:w-40">
          <ImageFallback
            src={imageUrl}
            alt={imageAlt}
            title={title}
            aspectRatio="4 / 3"
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          {whyLabel && <p className="text-kicker text-signal">{whyLabel}</p>}
          <p className="line-clamp-3 text-xl leading-tight font-medium group-hover:underline group-hover:decoration-1 group-hover:underline-offset-4 sm:text-2xl">
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
    </li>
  );
}
