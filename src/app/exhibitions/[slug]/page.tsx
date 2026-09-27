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
  imageAlt,
  timeBarProps,
  urgencyLabelText,
} from "~/app/_lib/exhibition-format";
import { toRowView } from "~/app/_lib/row";
import { getPhase, todayInHelsinki } from "~/domain/dates";
import { archivedImagePath, imageSources } from "~/domain/images";
import { localized } from "~/domain/localized";
import { formatHours, hoursOn, nextFreeDay } from "~/domain/opening-hours";
import { getI18n } from "~/i18n/server";
import { formatDate, formatDayMonth } from "~/i18n/format";
import { INTL_LOCALE } from "~/i18n/locales";
import { auth } from "~/server/auth";
import { api } from "~/trpc/server";
import { siteUrl } from "~/app/_lib/site-url";

const FREE_DAY_WINDOW_DAYS = 14;

/** Shared with the page body: `generateMetadata` and the component both run per request, so this dedupes the query. */
const getExhibition = cache((slug: string) => api.exhibition.bySlug({ slug }));

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const [exhibition, { t, locale }] = await Promise.all([
    getExhibition(slug),
    getI18n(),
  ]);
  if (!exhibition) return {};
  const title = localized(exhibition, "title", locale).text;
  const museum = localized(exhibition.museum, "name", locale).text;
  const description = localized(exhibition, "description", locale).text;
  return {
    title: `${title} — ${museum} — ${t.app.name}`,
    description: description ? excerpt(description, 200) : undefined,
    alternates: { canonical: `/exhibitions/${exhibition.slug}` },
    openGraph: {
      type: "article",
      title: `${title} — ${museum}`,
      description: description ? excerpt(description, 200) : undefined,
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
  const i18n = await getI18n();
  const { t, locale } = i18n;
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
  const urgencyLabel = urgencyLabelText(exhibition, today, i18n);
  const openLabel = exhibition.endDate
    ? `${formatDate(exhibition.startDate, locale)}–${formatDate(exhibition.endDate, locale)}`
    : t.time.indefinite;
  const title = localized(exhibition, "title", locale);
  const museumName = localized(exhibition.museum, "name", locale);
  const description = localized(exhibition, "description", locale);

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
          <span lang={museumName.lang}>{museumName.text}</span>
        </Link>
      </nav>

      <header className="mt-4 flex max-w-4xl flex-col gap-3">
        {urgencyLabel && (
          <div>
            <UrgencyLabel label={urgencyLabel} />
          </div>
        )}
        <h1 lang={title.lang} className="text-headline text-4xl sm:text-6xl">
          {title.text}
        </h1>
        <p className="text-muted text-xl italic">
          {exhibition.venues.map((venue, index) => {
            const name = localized(venue, "name", locale);
            return (
              <span key={venue.slug}>
                {index > 0 && ", "}
                <span lang={name.lang}>{name.text}</span>
              </span>
            );
          })}
          {city && `, ${city}`}
        </p>
      </header>

      <div className="mt-6 grid gap-8 sm:grid-cols-[1.6fr_1fr] sm:gap-10">
        <div className="sm:col-start-1">
          <ImageFallback
            sources={imageSources(exhibition, today)}
            alt={imageAlt(title.text, museumName.text)}
            title={title.text}
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
                {exhibition.venues.map((venue, index) => {
                  const name = localized(venue, "name", locale);
                  return (
                    <span key={venue.slug}>
                      {index > 0 && ", "}
                      <Link
                        href={`/museums/${venue.slug}`}
                        lang={name.lang}
                        className="hover:text-signal underline decoration-1 underline-offset-4"
                      >
                        {name.text}
                      </Link>
                    </span>
                  );
                })}
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
                      name={museumName.text}
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
                      {t.pages.hours.nextFreeDay(
                        formatDayMonth(freeDay, locale),
                      )}
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
                      categories={exhibition.categories.map((category) => {
                        const name = localized(category, "name", locale);
                        return {
                          label: name.text,
                          lang: name.lang,
                          href: `/exhibitions?category=${category.id}`,
                        };
                      })}
                    />
                  </dd>
                </div>
              </>
            )}
          </dl>

          <TimeBar {...timeBarProps(exhibition, today, i18n)} />

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
                  new Intl.DateTimeFormat(INTL_LOCALE[locale], {
                    day: "numeric",
                    month: "numeric",
                    year: "numeric",
                  }).format(exhibition.lastFetchedAt),
                )}
              </p>
            )}
          </div>
        </aside>

        {description.text && (
          <div className="max-w-prose sm:col-start-1">
            <ExhibitionDescription description={description} />
          </div>
        )}
      </div>
      <Rail
        title={t.pages.detail.similar}
        items={similar.map((item) => ({ view: toRowView(item, today, i18n) }))}
        emptyMessage={t.pages.detail.similarEmpty}
        signedIn={Boolean(session?.user)}
      />
    </article>
  );
}
