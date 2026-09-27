import { type Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CategoryList } from "~/app/_components/CategoryList";
import { ExhibitionStatusControl } from "~/app/_components/ExhibitionStatusControl";
import { ImageFallback } from "~/app/_components/ImageFallback";
import { SignInPrompt } from "~/app/_components/SignInPrompt";
import { TimeBar } from "~/app/_components/TimeBar";
import { UrgencyLabel } from "~/app/_components/UrgencyLabel";
import {
  formatLongDate,
  imageAlt,
  timeBarProps,
  urgencyLabelText,
} from "~/app/_lib/exhibition-format";
import { todayInHelsinki } from "~/domain/dates";
import { t } from "~/i18n/fi";
import { auth } from "~/server/auth";
import { api } from "~/trpc/server";

const dateTimeFormat = new Intl.DateTimeFormat("fi-FI", {
  day: "numeric",
  month: "numeric",
  year: "numeric",
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const exhibition = await api.exhibition.bySlug({ slug });
  if (!exhibition) return {};
  return {
    title: `${exhibition.titleFi} — ${exhibition.museum.name} — ${t.app.name}`,
    description: exhibition.descriptionFi?.slice(0, 200),
  };
}

export default async function ExhibitionDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [exhibition, session] = await Promise.all([
    api.exhibition.bySlug({ slug }),
    auth(),
  ]);
  if (!exhibition) notFound();

  const today = todayInHelsinki();
  const urgencyLabel = urgencyLabelText(exhibition, today);
  const openLabel = exhibition.endDate
    ? `${formatLongDate(exhibition.startDate)}–${formatLongDate(exhibition.endDate)}`
    : t.time.indefinite;

  return (
    <article className="py-8 sm:flex sm:gap-8">
      <div className="sm:w-3/5">
        <ImageFallback
          src={exhibition.imageUrl}
          alt={imageAlt(exhibition.titleFi, exhibition.museum.name)}
          title={exhibition.titleFi}
          aspectRatio="4 / 5"
        />
      </div>

      <div className="mt-6 flex flex-col gap-6 sm:mt-0 sm:w-2/5">
        {urgencyLabel && <UrgencyLabel label={urgencyLabel} />}

        <h1 className="text-headline text-4xl">{exhibition.titleFi}</h1>

        {exhibition.descriptionFi && (
          <p className="text-sm leading-relaxed whitespace-pre-line">
            {exhibition.descriptionFi}
          </p>
        )}

        <dl className="border-rule-soft divide-rule-soft grid grid-cols-2 gap-y-2 divide-y border-y text-sm [&>*]:py-2">
          <dt className="text-muted">{t.pages.detail.museum}</dt>
          <dd>
            <Link
              href={`/museums/${exhibition.museum.slug}`}
              className="hover:text-signal underline-offset-2 hover:underline"
            >
              {exhibition.museum.name}
            </Link>
          </dd>
          <dt className="text-muted">{t.pages.detail.city}</dt>
          <dd>{exhibition.museum.city}</dd>
          <dt className="text-muted">{t.pages.detail.open}</dt>
          <dd>{openLabel}</dd>
          {!exhibition.museumCardEligible && (
            <>
              <dt className="text-muted">{t.pages.detail.museumCard}</dt>
              <dd className="font-semibold">{t.pages.detail.noMuseumCard}</dd>
            </>
          )}
        </dl>

        <TimeBar {...timeBarProps(exhibition, today)} />

        {session?.user ? (
          <ExhibitionStatusControl
            exhibitionId={exhibition.id}
            initialStatus={exhibition.status}
          />
        ) : (
          <SignInPrompt message={t.pages.signIn.status} />
        )}

        <CategoryList
          categories={exhibition.categories.map((category) => ({
            label: category.name,
            href: `/exhibitions?category=${category.id}`,
          }))}
        />

        {exhibition.sourceUrl && (
          <a
            href={exhibition.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold underline-offset-2 hover:underline"
          >
            {t.pages.detail.source}
          </a>
        )}

        {exhibition.lastFetchedAt && (
          <p className="text-muted text-xs">
            {t.pages.updated(dateTimeFormat.format(exhibition.lastFetchedAt))}
          </p>
        )}
      </div>
    </article>
  );
}
