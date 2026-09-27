import { type Metadata } from "next";
import { notFound } from "next/navigation";

import { ExhibitionList } from "~/app/_components/ExhibitionList";
import { Section } from "~/app/_components/Section";
import { toRowView } from "~/app/_lib/row";
import { todayInHelsinki } from "~/domain/dates";
import { t } from "~/i18n/fi";
import { auth } from "~/server/auth";
import { api } from "~/trpc/server";
import { siteUrl } from "~/app/_lib/site-url";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const museum = await api.museum.bySlug({ slug });
  if (!museum) return {};
  return {
    title: `${museum.name} — ${t.app.name}`,
    description: [museum.name, museum.city, t.pages.meta.museums]
      .filter(Boolean)
      .join(". "),
    alternates: { canonical: `/museums/${museum.slug}` },
    openGraph: {
      type: "website",
      title: `${museum.name} — ${t.app.name}`,
      description: [museum.name, museum.city, t.pages.meta.museums]
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
  const { slug } = await params;
  const [museum, exhibitions, session] = await Promise.all([
    api.museum.bySlug({ slug }),
    api.museum.exhibitions({ slug }),
    auth(),
  ]);
  if (!museum) notFound();

  const today = todayInHelsinki();
  const signedIn = Boolean(session?.user);
  const present = exhibitions.filter(
    (item): item is NonNullable<typeof item> => item !== null,
  );
  const byPhase = {
    current: present.filter((item) => item.phase === "current"),
    upcoming: present.filter((item) => item.phase === "upcoming"),
    ended: present.filter((item) => item.phase === "ended"),
  };

  return (
    <div className="py-8">
      <h1 className="text-headline text-4xl sm:text-6xl">{museum.name}</h1>
      {museum.city && (
        <p className="text-muted mt-2 text-xl italic">{museum.city}</p>
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

      <Section title={t.pages.museums.current}>
        <ExhibitionList
          items={byPhase.current.map((item) => toRowView(item, today))}
          emptyMessage={t.pages.museums.empty}
          signedIn={signedIn}
        />
      </Section>

      <Section title={t.pages.museums.upcoming}>
        <ExhibitionList
          items={byPhase.upcoming.map((item) => toRowView(item, today))}
          emptyMessage={t.pages.museums.empty}
          signedIn={signedIn}
        />
      </Section>

      <Section title={t.pages.museums.past}>
        <ExhibitionList
          items={byPhase.ended.map((item) => toRowView(item, today))}
          emptyMessage={t.pages.museums.empty}
          signedIn={signedIn}
        />
      </Section>
    </div>
  );
}
