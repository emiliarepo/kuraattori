import Link from "next/link";

import { CategoryList } from "~/app/_components/CategoryList";
import { ImageFallback } from "~/app/_components/ImageFallback";
import { STATUS_LABEL } from "~/app/_components/StatusActions";
import { TimeBar } from "~/app/_components/TimeBar";
import { type ExhibitionRowView } from "~/app/_lib/row";

export function ExhibitionCard({
  item,
  lead,
}: {
  item: ExhibitionRowView;
  lead?: React.ReactNode;
}) {
  return (
    <Link href={item.href} className="group flex flex-col gap-2">
      <ImageFallback
        src={item.imageUrl}
        alt={item.imageAlt}
        title={item.title}
        aspectRatio="4 / 5"
      />
      {lead}
      {item.whyLabel && (
        <p className="text-kicker text-signal">{item.whyLabel}</p>
      )}
      <p className="line-clamp-3 text-lg leading-tight font-medium group-hover:underline group-hover:decoration-1 group-hover:underline-offset-4">
        {item.title}
      </p>
      <p className="text-muted font-sans text-xs leading-snug">
        {item.museum}
        {item.city && `, ${item.city}`}
      </p>
      <CategoryList categories={item.categories} />
      {!lead && <TimeBar {...item.timeBar} />}
      {item.status && (
        <p className="text-kicker">{STATUS_LABEL[item.status]}</p>
      )}
    </Link>
  );
}
