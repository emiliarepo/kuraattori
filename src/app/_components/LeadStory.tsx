import Link from "next/link";

import { ImageFallback } from "~/app/_components/ImageFallback";
import { UrgencyLabel } from "~/app/_components/UrgencyLabel";
import { type LocalizedText } from "~/domain/localized";

export function LeadStory({
  href,
  imageSources,
  imageAlt,
  kicker,
  title,
  museum,
  city,
  urgencyLabel,
}: {
  href: string;
  imageSources: readonly string[];
  imageAlt: string;
  kicker: string;
  title: LocalizedText;
  museum: LocalizedText;
  city: string;
  urgencyLabel?: string | null;
}) {
  return (
    <Link
      href={href}
      className="group grid gap-4 sm:grid-cols-[3fr_2fr] sm:items-end sm:gap-8"
    >
      <ImageFallback
        sources={imageSources}
        alt={imageAlt}
        title={title.text}
        aspectRatio="3 / 2"
        priority
      />
      <div className="flex flex-col gap-2 sm:pb-1">
        <p className="text-kicker text-signal">{kicker}</p>
        <h2
          lang={title.lang}
          className="text-headline text-[2rem] group-hover:underline group-hover:decoration-1 group-hover:underline-offset-4 sm:text-5xl"
        >
          {title.text}
        </h2>
        <p className="text-muted text-lg italic">
          <span lang={museum.lang}>{museum.text}</span>
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
