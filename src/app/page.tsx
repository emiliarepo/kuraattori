import { type Metadata } from "next";
import Link from "next/link";

import { DaysNumeral } from "~/app/_components/DaysNumeral";
import { LeadStory } from "~/app/_components/LeadStory";
import { Rail } from "~/app/_components/Rail";
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
        ? api.recommendation.forYou({ limit: SECTION_LIMIT + 1 })
        : Promise.resolve([]),
      api.meta.lastImportAt(),
    ]);

  const endingSoonSorted = [...endingSoon.items].sort(
    (a, b) =>
      Number(b.status === "interested") - Number(a.status === "interested"),
  );
  const [lead, ...forYouRest] = forYou;

  return (
    <div className="pt-6 sm:pt-8">
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

      {signedIn && (lead === undefined || forYouRest.length > 0) && (
        <Rail
          title={t.pages.home.forYou}
          emptyMessage={t.pages.browse.empty}
          items={forYouRest.map((item) => ({
            view: forYouToRowView(item, today),
          }))}
        />
      )}

      <Rail
        title={t.pages.home.new}
        emptyMessage={t.pages.browse.empty}
        items={freshest.map((item) => ({ view: toRowView(item, today) }))}
      />

      <Rail
        title={t.pages.home.upcoming}
        emptyMessage={t.pages.browse.empty}
        more={{
          href: "/exhibitions?state=upcoming",
          label: t.pages.home.seeAll,
        }}
        items={upcoming.items.map((item) => ({ view: toRowView(item, today) }))}
      />

      <div className="mt-10">
        <StaleDataNotice lastImportAt={lastImportAt} />
      </div>
    </div>
  );
}
