import { type Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";

import { CategoryList } from "~/app/_components/CategoryList";
import { ExhibitionDescription } from "~/app/_components/ExhibitionDescription";
import { ExhibitionStatusControl } from "~/app/_components/ExhibitionStatusControl";
import { ImageFallback } from "~/app/_components/ImageFallback";
import { MuseumAddress } from "~/app/_components/MuseumAddress";
import { Rail } from "~/app/_components/Rail";
import { SignInPrompt } from "~/app/_components/SignInPrompt";
import { TimeBar } from "~/app/_components/TimeBar";
import { UrgencyLabel } from "~/app/_components/UrgencyLabel";
import {
  excerpt,
  formatLongDate,
  imageAlt,
  timeBarProps,
  urgencyLabelText,
} from "~/app/_lib/exhibition-format";
import { toRowView } from "~/app/_lib/row";
import { getPhase, todayInHelsinki } from "~/domain/dates";
import { archivedImagePath, imageSources } from "~/domain/images";
import { formatHours, hoursOn, nextFreeDay } from "~/domain/opening-hours";
import { t } from "~/i18n/fi";
import { formatDayMonth } from "~/i18n/format";
import { auth } from "~/server/auth";
import { api } from "~/trpc/server";
import { siteUrl } from "~/app/_lib/site-url";

const FREE_DAY_WINDOW_DAYS = 14;

const dateTimeFormat = new Intl.DateTimeFormat("fi-FI", {
  day: "numeric",
  month: "numeric",
  year: "numeric",
});

/** Shared with the page body: `generateMetadata` and the component both run per request, so this dedupes the query. */
const getExhibition = cache((slug: string) => api.exhibition.bySlug({ slug }));

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const exhibition = await getExhibition(slug);
  if (!exhibition) return {};
  return {
    title: `${exhibition.titleFi} — ${exhibition.museum.name} — ${t.app.name}`,
    description: exhibition.descriptionFi
      ? excerpt(exhibition.descriptionFi, 200)
      : undefined,
    alternates: { canonical: `/exhibitions/${exhibition.slug}` },
    openGraph: {
      type: "article",
      title: `${exhibition.titleFi} — ${exhibition.museum.name}`,
      description: exhibition.descriptionFi
        ? excerpt(exhibition.descriptionFi, 200)
        : undefined,
      url: new URL(`/exhibitions/${exhibition.slug}`, siteUrl),
      images: [
        exhibition.imageArchiveKey
          ? archivedImagePath(exhibition.imageArchiveKey)
          : (exhibition.imageUrl ?? "/logo-512.png"),
      ],
    },
  };
}

export default async function ExhibitionDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [exhibition, session] = await Promise.all([
    getExhibition(slug),
    auth(),
  ]);
  if (!exhibition) notFound();

  const today = todayInHelsinki();
  // A secondary rail: falls back to an EmptyState rather than the failure
  // sinking the whole page. Already logged by the tRPC error-logging
  // middleware.
  const similar = await api.exhibition.similar({ slug }).catch(() => []);
  const urgencyLabel = urgencyLabelText(exhibition, today);
  const openLabel = exhibition.endDate
    ? `${formatLongDate(exhibition.startDate)}–${formatLongDate(exhibition.endDate)}`
    : t.time.indefinite;

  const city = exhibition.museum.city;
  const isCurrent = getPhase(exhibition, today) === "current";
  const todayHours = isCurrent
    ? hoursOn(exhibition.museum.openingHours?.days, today)
    : undefined;
  const freeDay = isCurrent
    ? nextFreeDay(exhibition.museum.freeDays, today, FREE_DAY_WINDOW_DAYS)
    : undefined;

  return (
    <article className="py-8">
      <nav
        aria-label={t.pages.detail.breadcrumb}
        className="text-muted font-sans text-xs"
      >
        <Link href="/exhibitions" className="hover:text-fg hover:underline">
          {t.pages.detail.exhibitions}
        </Link>
        {city && (
          <>
            {" / "}
            <Link
              href={`/exhibitions?city=${encodeURIComponent(city)}`}
              className="hover:text-fg hover:underline"
            >
              {city}
            </Link>
          </>
        )}
        {" / "}
        <Link
          href={`/museums/${exhibition.museum.slug}`}
          className="hover:text-fg hover:underline"
        >
          {exhibition.museum.name}
        </Link>
      </nav>

      <header className="mt-4 flex max-w-4xl flex-col gap-3">
        {urgencyLabel && (
          <div>
            <UrgencyLabel label={urgencyLabel} />
          </div>
        )}
        <h1 className="text-headline text-4xl sm:text-6xl">
          {exhibition.titleFi}
        </h1>
        <p className="text-muted text-xl italic">
          {exhibition.venues.map((venue) => venue.name).join(", ")}
          {city && `, ${city}`}
        </p>
      </header>

      <div className="mt-6 grid gap-8 sm:grid-cols-[1.6fr_1fr] sm:gap-10">
        <div className="sm:col-start-1">
          <ImageFallback
            sources={imageSources(exhibition, today)}
            alt={imageAlt(exhibition.titleFi, exhibition.museum.name)}
            title={exhibition.titleFi}
            aspectRatio="3 / 2"
          />
        </div>

        <aside className="sm:border-rule-soft flex flex-col gap-6 sm:sticky sm:top-6 sm:col-start-2 sm:row-span-2 sm:row-start-1 sm:self-start sm:border-l sm:pl-6">
          <dl className="divide-rule-soft border-rule-soft grid grid-cols-[auto_1fr] gap-x-4 divide-y border-y font-sans text-sm leading-snug">
            <div className="col-span-2 grid grid-cols-subgrid items-baseline py-2.5">
              <dt className="text-kicker text-muted">
                {t.pages.detail.museum}
              </dt>
              <dd>
                {exhibition.venues.map((venue, index) => (
                  <span key={venue.slug}>
                    {index > 0 && ", "}
                    <Link
                      href={`/museums/${venue.slug}`}
                      className="hover:text-signal underline decoration-1 underline-offset-4"
                    >
                      {venue.name}
                    </Link>
                  </span>
                ))}
              </dd>
            </div>
            <div className="col-span-2 grid grid-cols-subgrid items-baseline py-2.5">
              <dt className="text-kicker text-muted">{t.pages.detail.city}</dt>
              <dd>{city}</dd>
            </div>
            {exhibition.museum.address && (
              <>
                <div className="col-span-2 grid grid-cols-subgrid items-baseline py-2.5">
                  <dt className="text-kicker text-muted">
                    {t.pages.detail.address}
                  </dt>
                  <dd>
                    <MuseumAddress
                      name={exhibition.museum.name}
                      address={exhibition.museum.address}
                    />
                  </dd>
                </div>
              </>
            )}
            <div className="col-span-2 grid grid-cols-subgrid items-baseline py-2.5">
              <dt className="text-kicker text-muted">{t.pages.detail.open}</dt>
              <dd className="tabular-nums">{openLabel}</dd>
            </div>
            {(todayHours !== undefined || freeDay) && (
              <div className="col-span-2 grid grid-cols-subgrid items-baseline py-2.5">
                <dt className="text-kicker text-muted">
                  {t.pages.hours.label}
                </dt>
                <dd className="flex flex-col gap-1 tabular-nums">
                  {todayHours !== undefined && (
                    <span>
                      {todayHours
                        ? t.pages.hours.openToday(formatHours(todayHours))
                        : t.pages.hours.closedToday}
                    </span>
                  )}
                  {freeDay && (
                    <span>
                      {t.pages.hours.nextFreeDay(formatDayMonth(freeDay))}
                    </span>
                  )}
                </dd>
              </div>
            )}
            {!exhibition.museumCardEligible && (
              <>
                <div className="col-span-2 grid grid-cols-subgrid items-baseline py-2.5">
                  <dt className="text-kicker text-muted">
                    {t.pages.detail.museumCard}
                  </dt>
                  <dd className="font-semibold">
                    {t.pages.detail.noMuseumCard}
                  </dd>
                </div>
              </>
            )}
            {exhibition.categories.length > 0 && (
              <>
                <div className="col-span-2 grid grid-cols-subgrid items-baseline py-2.5">
                  <dt className="text-kicker text-muted">
                    {t.pages.detail.categories}
                  </dt>
                  <dd>
                    <CategoryList
                      className="text-sm leading-snug"
                      categories={exhibition.categories.map((category) => ({
                        label: category.name,
                        href: `/exhibitions?category=${category.id}`,
                      }))}
                    />
                  </dd>
                </div>
              </>
            )}
          </dl>

          <TimeBar {...timeBarProps(exhibition, today)} />

          {session?.user ? (
            <ExhibitionStatusControl
              exhibitionId={exhibition.id}
              initialStatus={exhibition.status}
              startDate={exhibition.startDate}
              initialVisitedAt={exhibition.visitedAt}
              initialNote={exhibition.visitNote}
              initialRating={exhibition.rating}
            />
          ) : (
            <SignInPrompt message={t.pages.signIn.status} />
          )}

          <div className="flex flex-col gap-1 font-sans text-xs">
            {exhibition.sourceUrl && (
              <a
                href={exhibition.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-signal font-semibold underline underline-offset-4"
              >
                {t.pages.detail.source}
              </a>
            )}
            {exhibition.lastFetchedAt && (
              <p className="text-muted">
                {t.pages.updated(
                  dateTimeFormat.format(exhibition.lastFetchedAt),
                )}
              </p>
            )}
          </div>
        </aside>

        {exhibition.descriptionFi && (
          <div className="max-w-prose sm:col-start-1">
            <ExhibitionDescription text={exhibition.descriptionFi} />
          </div>
        )}
      </div>
      <Rail
        title="Samankaltaisia"
        items={similar.map((item) => ({ view: toRowView(item, today) }))}
        emptyMessage="Ei samankaltaisia näyttelyitä."
        signedIn={Boolean(session?.user)}
      />
    </article>
  );
}
