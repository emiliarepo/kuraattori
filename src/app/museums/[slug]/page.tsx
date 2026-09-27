import { type Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";

import { ExhibitionList } from "~/app/_components/ExhibitionList";
import { MuseumAddress } from "~/app/_components/MuseumAddress";
import { OpeningHoursList } from "~/app/_components/OpeningHoursList";
import { FollowToggle } from "~/app/_components/FollowToggle";
import { Section } from "~/app/_components/Section";
import { dayPlanHref } from "~/app/_lib/day-plan-params";
import { toRowView } from "~/app/_lib/row";
import { todayInHelsinki } from "~/domain/dates";
import { localized } from "~/domain/localized";
import { getI18n } from "~/i18n/server";
import { auth } from "~/server/auth";
import { api } from "~/trpc/server";
import { siteUrl } from "~/app/_lib/site-url";

/** Shared with the page body: `generateMetadata` and the component both run per request, so this dedupes the query. */
const getMuseum = cache((slug: string) => api.museum.bySlug({ slug }));

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const [museum, { t, locale }] = await Promise.all([
    getMuseum(slug),
    getI18n(),
  ]);
  if (!museum) return {};
  const name = localized(museum, "name", locale).text;
  return {
    title: `${name} — ${t.app.name}`,
    description: [name, museum.city, t.pages.meta.museums]
      .filter(Boolean)
      .join(". "),
    alternates: { canonical: `/museums/${museum.slug}` },
    openGraph: {
      type: "website",
      title: `${name} — ${t.app.name}`,
      description: [name, museum.city, t.pages.meta.museums]
        .filter(Boolean)
        .join(". "),
      url: new URL(`/museums/${museum.slug}`, siteUrl),
    },
  };
}

export default async function MuseumDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const i18n = await getI18n();
  const { t, locale } = i18n;
  const { slug } = await params;
  const [museum, exhibitions, session] = await Promise.all([
    getMuseum(slug),
    api.museum.exhibitions({ slug }),
    auth(),
  ]);
  if (!museum) notFound();

  const today = todayInHelsinki();
  const signedIn = Boolean(session?.user);
  const followed = signedIn ? await api.museum.followed() : [];
  const isFollowing = followed.some((entry) => entry.id === museum.id);
  const name = localized(museum, "name", locale);
  const byPhase = {
    current: exhibitions.filter((item) => item.phase === "current"),
    upcoming: exhibitions.filter((item) => item.phase === "upcoming"),
    ended: exhibitions.filter((item) => item.phase === "ended"),
  };

  return (
    <div className="py-8">
      <div className="flex items-start gap-4">
        <h1
          lang={name.lang}
          className="text-headline min-w-0 text-4xl sm:text-6xl"
        >
          {name.text}
        </h1>
        {signedIn && (
          <div className="text-headline flex h-[1lh] shrink-0 items-center text-4xl sm:text-6xl">
            <FollowToggle
              museumId={museum.id}
              museumName={name.text}
              initialFollowing={isFollowing}
            />
          </div>
        )}
      </div>
      {museum.city && (
        <p className="mt-2 flex flex-wrap items-baseline gap-x-4">
          <span className="text-muted text-xl italic">{museum.city}</span>
          <Link
            href={dayPlanHref({ city: museum.city, date: today })}
            className="hover:text-signal font-sans text-sm underline underline-offset-4"
          >
            {t.pages.day.fromMuseum}
          </Link>
        </p>
      )}
      {museum.address && (
        <div className="mt-3">
          <MuseumAddress name={name.text} address={museum.address} />
        </div>
      )}
      {museum.websiteUrl && (
        <a
          href={museum.websiteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-signal mt-3 inline-block font-sans text-sm break-all underline underline-offset-4"
        >
          {museum.websiteUrl}
        </a>
      )}
      <OpeningHoursList
        hours={museum.openingHours}
        freeDays={museum.freeDays}
        today={today}
      />

      <Section title={t.pages.museums.current}>
        <ExhibitionList
          items={byPhase.current.map((item) => toRowView(item, today, i18n))}
          emptyMessage={t.pages.museums.empty}
          signedIn={signedIn}
        />
      </Section>

      <Section title={t.pages.museums.upcoming}>
        <ExhibitionList
          items={byPhase.upcoming.map((item) => toRowView(item, today, i18n))}
          emptyMessage={t.pages.museums.empty}
          signedIn={signedIn}
        />
      </Section>

      <Section title={t.pages.museums.past}>
        <ExhibitionList
          items={byPhase.ended.map((item) => toRowView(item, today, i18n))}
          emptyMessage={t.pages.museums.empty}
          signedIn={signedIn}
        />
      </Section>
    </div>
  );
}
