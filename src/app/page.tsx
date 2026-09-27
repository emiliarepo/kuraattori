import { type Metadata } from "next";
import Link from "next/link";

import { DaysNumeral } from "~/app/_components/DaysNumeral";
import { LeadStory } from "~/app/_components/LeadStory";
import { Rail } from "~/app/_components/Rail";
import { Section } from "~/app/_components/Section";
import { SignInPrompt } from "~/app/_components/SignInPrompt";
import { StaleDataNotice } from "~/app/_components/StaleDataNotice";
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

export default async function HomePage() {
  const [session, activeRegions] = await Promise.all([
    auth(),
    getActiveRegions(),
  ]);
  const signedIn = Boolean(session?.user);
  const today = todayInHelsinki();

  // Each rail is an independent query: one D1 failure falls back to an empty
  // section (rendered as an EmptyState by Rail) instead of the whole page.
  // The underlying failure is already logged by the tRPC error-logging
  // middleware.
  const emptyList = { items: [], nextCursor: null };
  const [
    endingSoon,
    upcoming,
    freshest,
    forYou,
    lastImportAt,
    interests,
    followedMuseumCount,
    followedExhibitions,
  ] = await Promise.all([
    listAcrossRegions(activeRegions, {
      state: "current",
      endingWithinDays: 14,
      limit: SECTION_LIMIT,
    }).catch(() => emptyList),
    listAcrossRegions(activeRegions, {
      state: "upcoming",
      limit: SECTION_LIMIT,
    }).catch(() => emptyList),
    listNewAcrossRegions(activeRegions, { limit: SECTION_LIMIT }).catch(
      () => [],
    ),
    signedIn
      ? api.recommendation.forYou({ limit: SECTION_LIMIT + 1 }).catch(() => [])
      : Promise.resolve([]),
    api.meta.lastImportAt().catch(() => null),
    signedIn
      ? api.profile
          .get()
          .then((profile) => profile.interests)
          .catch(() => [])
      : [],
    signedIn
      ? api.museum
          .followed()
          .then((rows) => rows.length)
          .catch(() => 0)
      : 0,
    signedIn
      ? api.museum.followedExhibitions({ limit: SECTION_LIMIT }).catch(() => [])
      : Promise.resolve([]),
  ]);
  const hasInterests = interests.some((interest) => interest.weight !== -1);

  const endingSoonSorted = [...endingSoon.items].sort(
    (a, b) =>
      Number(b.status === "interested") - Number(a.status === "interested"),
  );
  const [lead, ...forYouRest] = forYou;

  return (
    <div className="pt-8">
      <h1 className="sr-only">{t.app.name}</h1>

      <div className="mb-4 flex justify-end">
        <Link
          href="/trip"
          className="hover:text-signal font-sans text-sm underline underline-offset-4"
        >
          {t.pages.trip.entry}
        </Link>
      </div>

      {lead ? (
        <LeadStory
          href={`/exhibitions/${lead.exhibition.slug}`}
          imageUrl={lead.exhibition.imageUrl}
          imageAlt={imageAlt(lead.exhibition.titleFi, lead.museum.name)}
          kicker={[t.pages.home.forYou, ...lead.reasons].join(" · ")}
          title={lead.exhibition.titleFi}
          museum={lead.museum.name}
          city={lead.museum.city ?? ""}
          urgencyLabel={urgencyLabelText(lead.exhibition, today)}
        />
      ) : (
        !signedIn && <SignInPrompt message={t.pages.signIn.home} />
      )}

      <Rail
        title={t.pages.home.endingSoon}
        emptyMessage={t.pages.browse.empty}
        more={{ href: "/exhibitions?ending=14", label: t.pages.home.seeAll }}
        signedIn={signedIn}
        items={endingSoonSorted.map((item) => {
          const daysRemaining = getDaysRemaining(item, today) ?? 0;
          return {
            view: toRowView(item, today),
            lead: (
              <DaysNumeral
                days={daysRemaining}
                caption={dayCaption(daysRemaining)}
              />
            ),
          };
        })}
      />

      {signedIn &&
        (hasInterests ? (
          (lead === undefined || forYouRest.length > 0) && (
            <Rail
              title={t.pages.home.forYou}
              emptyMessage={t.pages.browse.empty}
              signedIn={signedIn}
              items={forYouRest.map((item) => ({
                view: forYouToRowView(item, today),
              }))}
            />
          )
        ) : (
          <Section title={t.pages.home.forYou}>
            <p className="text-muted py-6 italic">
              <Link
                href="/profile"
                className="text-fg hover:text-signal font-sans text-sm font-semibold not-italic underline underline-offset-4"
              >
                {t.pages.home.chooseInterests}
              </Link>
            </p>
          </Section>
        ))}

      {signedIn && followedMuseumCount > 0 && (
        <Rail
          title={t.pages.home.followedMuseums}
          emptyMessage={t.pages.browse.empty}
          signedIn={signedIn}
          items={followedExhibitions.map((item) => ({
            view: toRowView(item, today),
          }))}
        />
      )}

      <Rail
        title={t.pages.home.new}
        emptyMessage={t.pages.browse.empty}
        signedIn={signedIn}
        items={freshest.map((item) => ({ view: toRowView(item, today) }))}
      />

      <Rail
        title={t.pages.home.upcoming}
        emptyMessage={t.pages.browse.empty}
        more={{
          href: "/exhibitions?state=upcoming",
          label: t.pages.home.seeAll,
        }}
        signedIn={signedIn}
        items={upcoming.items.map((item) => ({ view: toRowView(item, today) }))}
      />

      <div className="mt-10">
        <StaleDataNotice lastImportAt={lastImportAt} />
      </div>
    </div>
  );
}
