import Link from "next/link";

import { DaysNumeral } from "~/app/_components/DaysNumeral";
import { LeadStory } from "~/app/_components/LeadStory";
import { Rail } from "~/app/_components/Rail";
import { Section } from "~/app/_components/Section";
import { FeedShortcut } from "~/app/_components/FeedShortcut";
import { NearbyBanner } from "~/app/nearby/NearbyBanner";
import { SignInPrompt } from "~/app/_components/SignInPrompt";
import {
  dayCaption,
  imageAlt,
  urgencyLabelText,
} from "~/app/_lib/exhibition-format";
import { forYouToRowView, toRowView } from "~/app/_lib/row";
import { getDaysRemaining, todayInHelsinki } from "~/domain/dates";
import { editionSlugForRegion } from "~/domain/edition";
import { getI18n } from "~/i18n/server";
import { imageSources } from "~/domain/images";
import { localized } from "~/domain/localized";
import { auth } from "~/server/auth";
import { getActiveRegions } from "~/server/regions-preference";
import { api } from "~/trpc/server";

export const SECTION_LIMIT = 8;

export async function HomeFeed() {
  const i18n = await getI18n();
  const { t, locale } = i18n;
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
    interests,
    followedMuseumCount,
    followedExhibitions,
  ] = await Promise.all([
    api.exhibition
      .list({
        regions: [...activeRegions],
        state: "current",
        endingWithinDays: 14,
        limit: SECTION_LIMIT,
      })
      .catch(() => emptyList),
    api.exhibition
      .list({
        regions: [...activeRegions],
        state: "upcoming",
        limit: SECTION_LIMIT,
      })
      .catch(() => emptyList),
    api.exhibition
      .new({ regions: [...activeRegions], limit: SECTION_LIMIT })
      .catch(() => []),
    signedIn
      ? api.recommendation
          .forYou({ limit: SECTION_LIMIT + 1, locale })
          .catch(() => [])
      : Promise.resolve([]),
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
  const leadTitle = lead && localized(lead.exhibition, "title", locale);
  const leadMuseum = lead && localized(lead.museum, "name", locale);
  const editionSlug =
    activeRegions.map(editionSlugForRegion).find(Boolean) ?? "paakaupunkiseutu";

  return (
    <div className="pt-8 [&>h1+section]:mt-0">
      <h1 className="sr-only">{t.app.name}</h1>

      <div className="border-rule-soft mb-5 grid gap-x-8 border-b sm:grid-cols-2">
        <NearbyBanner />
        <FeedShortcut
          href={`/edition/${editionSlug}`}
          title={t.pages.home.thisWeeksEdition}
          hint={t.pages.home.thisWeeksEditionHint}
        />
      </div>

      {lead && leadTitle && leadMuseum ? (
        <LeadStory
          href={`/exhibitions/${lead.exhibition.slug}`}
          imageSources={imageSources(lead.exhibition, today)}
          imageAlt={imageAlt(leadTitle.text, leadMuseum.text)}
          kicker={[t.pages.home.forYou, ...lead.reasons].join(" · ")}
          title={leadTitle}
          museum={leadMuseum}
          city={lead.museum.city ?? ""}
          urgencyLabel={urgencyLabelText(lead.exhibition, today, i18n)}
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
            view: toRowView(item, today, i18n),
            lead: (
              <DaysNumeral
                days={daysRemaining}
                caption={dayCaption(daysRemaining, i18n)}
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
                view: forYouToRowView(item, today, i18n),
              }))}
            />
          )
        ) : (
          <Section title={t.pages.home.forYou}>
            <p className="text-muted italic">
              <Link
                href="/settings"
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
            view: toRowView(item, today, i18n),
          }))}
        />
      )}

      <Rail
        title={t.pages.home.new}
        emptyMessage={t.pages.browse.empty}
        signedIn={signedIn}
        items={freshest.map((item) => ({ view: toRowView(item, today, i18n) }))}
      />

      <Rail
        title={t.pages.home.upcoming}
        emptyMessage={t.pages.browse.empty}
        more={{
          href: "/exhibitions?state=upcoming",
          label: t.pages.home.seeAll,
        }}
        signedIn={signedIn}
        items={upcoming.items.map((item) => ({
          view: toRowView(item, today, i18n),
        }))}
      />
    </div>
  );
}
