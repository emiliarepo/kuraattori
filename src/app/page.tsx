import { type Metadata } from "next";
import Link from "next/link";

import { DaysNumeral } from "~/app/_components/DaysNumeral";
import { EmptyState } from "~/app/_components/EmptyState";
import { ExhibitionList } from "~/app/_components/ExhibitionList";
import { Hero } from "~/app/_components/Hero";
import { SignInPrompt } from "~/app/_components/SignInPrompt";
import { StaleDataNotice } from "~/app/_components/StaleDataNotice";
import { UrgencyLabel } from "~/app/_components/UrgencyLabel";
import {
  dayCaption,
  imageAlt,
  urgencyLabelText,
} from "~/app/_lib/exhibition-format";
import {
  listAcrossRegions,
  listNewAcrossRegions,
} from "~/app/_lib/list-across-regions";
import { forYouToRowView, toRowView } from "~/app/_lib/row";
import { getDaysRemaining, todayInHelsinki } from "~/domain/dates";
import { t } from "~/i18n/fi";
import { auth } from "~/server/auth";
import { getActiveRegions } from "~/server/regions-preference";
import { api } from "~/trpc/server";

export const metadata: Metadata = {
  title: t.app.name,
  description: t.pages.meta.home,
};

const SECTION_LIMIT = 8;

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-rule-soft border-t py-8 first:border-t-0 first:pt-0">
      <h2 className="text-headline mb-4 text-2xl">{title}</h2>
      {children}
    </section>
  );
}

export default async function HomePage() {
  const [session, activeRegions] = await Promise.all([
    auth(),
    getActiveRegions(),
  ]);
  const signedIn = Boolean(session?.user);
  const today = todayInHelsinki();

  const [endingSoon, upcoming, freshest, forYou, lastImportAt] =
    await Promise.all([
      listAcrossRegions(activeRegions, {
        state: "current",
        endingWithinDays: 14,
        limit: SECTION_LIMIT,
      }),
      listAcrossRegions(activeRegions, {
        state: "upcoming",
        limit: SECTION_LIMIT,
      }),
      listNewAcrossRegions(activeRegions, { limit: SECTION_LIMIT }),
      signedIn
        ? api.recommendation.forYou({ limit: SECTION_LIMIT })
        : Promise.resolve([]),
      api.meta.lastImportAt(),
    ]);

  const endingSoonSorted = [...endingSoon.items].sort(
    (a, b) =>
      Number(b.status === "interested") - Number(a.status === "interested"),
  );
  const heroItem = forYou[0];
  const heroUrgencyLabel = heroItem
    ? urgencyLabelText(heroItem.exhibition, today)
    : null;

  return (
    <div className="py-8">
      {heroItem && (
        <section className="mb-8">
          <Hero
            imageUrl={heroItem.exhibition.imageUrl}
            imageAlt={imageAlt(
              heroItem.exhibition.titleFi,
              heroItem.museum.name,
            )}
            title={heroItem.exhibition.titleFi}
            museum={heroItem.museum.name}
            href={`/exhibitions/${heroItem.exhibition.slug}`}
          />
          {heroUrgencyLabel && (
            <div className="mt-2">
              <UrgencyLabel label={heroUrgencyLabel} />
            </div>
          )}
        </section>
      )}

      {!signedIn && <SignInPrompt message={t.pages.signIn.home} />}

      <Section title={t.pages.home.endingSoon}>
        {endingSoonSorted.length === 0 ? (
          <EmptyState message={t.pages.browse.empty} />
        ) : (
          <ul className="grid grid-cols-2 gap-6 sm:flex sm:flex-wrap sm:gap-10">
            {endingSoonSorted.map((item) => {
              const daysRemaining = getDaysRemaining(item, today) ?? 0;
              return (
                <li key={item.slug} className="flex flex-col gap-2">
                  <Link href={`/exhibitions/${item.slug}`}>
                    <DaysNumeral
                      days={daysRemaining}
                      caption={dayCaption(daysRemaining)}
                    />
                  </Link>
                  <p className="max-w-32 text-sm font-semibold">
                    <Link href={`/exhibitions/${item.slug}`}>
                      {item.titleFi}
                    </Link>
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      {signedIn && (
        <Section title={t.pages.home.forYou}>
          <ExhibitionList
            items={forYou.map((item) => forYouToRowView(item, today))}
            emptyMessage={t.pages.browse.empty}
            className="grid gap-x-8 sm:grid-cols-2"
          />
        </Section>
      )}

      <Section title={t.pages.home.new}>
        <ExhibitionList
          items={freshest.map((item) => toRowView(item, today))}
          emptyMessage={t.pages.browse.empty}
        />
      </Section>

      <Section title={t.pages.home.upcoming}>
        <ExhibitionList
          items={upcoming.items.map((item) => toRowView(item, today))}
          emptyMessage={t.pages.browse.empty}
        />
      </Section>

      <div className="mt-8">
        <StaleDataNotice lastImportAt={lastImportAt} />
      </div>
    </div>
  );
}
