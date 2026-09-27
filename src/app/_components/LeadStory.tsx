import Link from "next/link";

import { ImageFallback } from "~/app/_components/ImageFallback";
import { UrgencyLabel } from "~/app/_components/UrgencyLabel";

export function LeadStory({
  href,
  imageUrl,
  imageAlt,
  kicker,
  title,
  museum,
  city,
  urgencyLabel,
}: {
  href: string;
  imageUrl?: string | null;
  imageAlt: string;
  kicker: string;
  title: string;
  museum: string;
  city: string;
  urgencyLabel?: string | null;
}) {
  return (
    <Link
      href={href}
      className="group grid gap-4 sm:grid-cols-[3fr_2fr] sm:items-end sm:gap-8"
    >
      <ImageFallback
        src={imageUrl}
        alt={imageAlt}
        title={title}
        aspectRatio="3 / 2"
        priority
      />
      <div className="flex flex-col gap-2 sm:pb-1">
        <p className="text-kicker text-signal">{kicker}</p>
        <h2 className="text-headline text-[2rem] group-hover:underline group-hover:decoration-1 group-hover:underline-offset-4 sm:text-5xl">
          {title}
        </h2>
        <p className="text-muted text-lg italic">
          {museum}
          {city && `, ${city}`}
        </p>
        {urgencyLabel && (
          <div className="mt-1">
            <UrgencyLabel label={urgencyLabel} />
          </div>
        )}
      </div>
    </Link>
  );
}
