import Link from "next/link";

import { CategoryList, type Category } from "~/app/_components/CategoryList";
import { ImageFallback } from "~/app/_components/ImageFallback";
import { TimeBar, type TimeBarProps } from "~/app/_components/TimeBar";
import { type ExhibitionStatus } from "~/app/_components/StatusActions";
import { t } from "~/i18n/fi";

const STATUS_LABEL: Record<ExhibitionStatus, string> = {
  interested: t.ui.status.interested,
  visited: t.ui.status.visited,
  hidden: t.ui.status.hidden,
};

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
}) {
  return (
    <li className="border-rule-soft border-t first:border-t-0">
      <Link href={href} className="hover:bg-surface flex gap-4 py-4">
        <div className="w-24 flex-shrink-0 sm:w-32">
          <ImageFallback
            src={imageUrl}
            alt={imageAlt}
            title={title}
            aspectRatio="4 / 3"
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="truncate text-lg font-semibold">{title}</p>
          <p className="text-muted text-sm">
            {museum}, {city}
          </p>
          <CategoryList categories={categories} />
          <div className="mt-1">
            <TimeBar {...timeBar} />
          </div>
          {status && (
            <p className="mt-1 text-xs font-semibold">{STATUS_LABEL[status]}</p>
          )}
        </div>
      </Link>
    </li>
  );
}
