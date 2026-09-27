import { type Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";

import { EmptyState } from "~/app/_components/EmptyState";
import { ExhibitionRow } from "~/app/_components/ExhibitionRow";
import { LeadStory } from "~/app/_components/LeadStory";
import { Rail } from "~/app/_components/Rail";
import { Section } from "~/app/_components/Section";
import { EditionRegionTabs } from "~/app/edition/EditionRegionTabs";
import { imageAlt, urgencyLabelText } from "~/app/_lib/exhibition-format";
import { toRowView } from "~/app/_lib/row";
import { siteUrl } from "~/app/_lib/site-url";
import { todayInHelsinki } from "~/domain/dates";
import { editionRegionBySlug } from "~/domain/edition";
import { archivedImagePath, imageSources } from "~/domain/images";
import { localized } from "~/domain/localized";
import { formatDate } from "~/i18n/format";
import { getI18n } from "~/i18n/server";
import { auth } from "~/server/auth";
import { api } from "~/trpc/server";

type Params = Promise<{ region: string; date: string }>;

const getEdition = cache((region: string, date: string) =>
  editionRegionBySlug(region) ? api.edition.get({ region, date }) : null,
);

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { region: slug, date } = await params;
  const region = editionRegionBySlug(slug);
  const [edition, { t, locale }] = await Promise.all([
    getEdition(slug, date),
    getI18n(),
  ]);
  if (!region || !edition) return {};
  const title = [
    t.pages.edition.name,
    region.region,
    formatDate(date, locale),
  ].join(" · ");
  const description = t.pages.meta.edition(region.region);
  const lead = edition.lead;
  return {
    title: `${title} — ${t.app.name}`,
    description,
    alternates: { canonical: `/edition/${slug}/${date}` },
    openGraph: {
      type: "article",
      title,
      description,
      url: new URL(`/edition/${slug}/${date}`, siteUrl),
      images: [
        lead?.imageArchiveKey
          ? archivedImagePath(lead.imageArchiveKey)
          : (lead?.imageUrl ?? "/logo-512.png"),
      ],
    },
  };
}

export default async function EditionPage({ params }: { params: Params }) {
  const { region: slug, date } = await params;
  const region = editionRegionBySlug(slug);
  if (!region) notFound();
  const [edition, archive, session, i18n] = await Promise.all([
    getEdition(slug, date),
    api.edition.archive({ region: slug }),
    auth(),
    getI18n(),
  ]);
  if (!edition) notFound();
  const { t, locale } = i18n;
  const signedIn = Boolean(session?.user);
  const today = todayInHelsinki();
  const { lead, gem } = edition;
  const leadTitle = lead && localized(lead, "title", locale);
  const leadMuseum = lead && localized(lead.museum, "name", locale);
  const gemView = gem && {
    ...toRowView(gem, today, i18n),
    whyLabel: t.pages.edition.hiddenGemWhy,
  };

  return (
    <div className="py-8">
      <EditionRegionTabs active={slug} />

      <header className="mt-8 mb-6 text-center">
        <h1 className="text-headline text-[2.75rem] italic sm:text-7xl">
          {t.pages.edition.name}
        </h1>
        <p className="border-rule text-kicker mt-4 border-y py-2 tabular-nums">
          {region.region} · {formatDate(date, locale)}
        </p>
      </header>

      {lead && leadTitle && leadMuseum ? (
        <LeadStory
          href={`/exhibitions/${lead.slug}`}
          imageSources={imageSources(lead, today)}
          imageAlt={imageAlt(leadTitle.text, leadMuseum.text)}
          kicker={[
            t.pages.edition.lead,
            ...lead.categories
              .slice(0, 2)
              .map((category) => localized(category, "name", locale).text),
          ].join(" · ")}
          title={leadTitle}
          museum={leadMuseum}
          city={lead.museum.city ?? ""}
          urgencyLabel={urgencyLabelText(lead, today, i18n)}
        />
      ) : (
        <EmptyState message={t.pages.edition.noLead} />
      )}

      <Rail
        title={t.pages.edition.endingThisWeek}
        emptyMessage={t.pages.edition.emptyEnding}
        signedIn={signedIn}
        items={edition.ending.map((item) => ({
          view: toRowView(item, today, i18n),
        }))}
      />

      <Rail
        title={t.pages.edition.openingThisWeek}
        emptyMessage={t.pages.edition.emptyOpening}
        signedIn={signedIn}
        items={edition.opening.map((item) => ({
          view: toRowView(item, today, i18n),
        }))}
      />

      {gemView && (
        <Section title={t.pages.edition.hiddenGem}>
          <ul>
            <ExhibitionRow {...gemView} signedIn={signedIn} />
          </ul>
        </Section>
      )}

      <Section title={t.pages.edition.archive}>
        <ul className="flex flex-wrap gap-x-6 gap-y-2 font-sans text-sm tabular-nums">
          {archive.map((archived) => (
            <li key={archived}>
              {archived === date ? (
                <span aria-current="page" className="text-signal font-semibold">
                  {formatDate(archived, locale)}
                </span>
              ) : (
                <Link
                  href={`/edition/${slug}/${archived}`}
                  className="hover:text-signal underline underline-offset-4"
                >
                  {formatDate(archived, locale)}
                </Link>
              )}
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}
