import { type Metadata } from "next";
import { notFound } from "next/navigation";

import { ExhibitionList } from "~/app/_components/ExhibitionList";
import { toRowView } from "~/app/_lib/row";
import { todayInHelsinki } from "~/domain/dates";
import { t } from "~/i18n/fi";
import { api } from "~/trpc/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const museum = await api.museum.bySlug({ slug });
  if (!museum) return {};
  return { title: `${museum.name} — ${t.app.name}` };
}

export default async function MuseumDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [museum, exhibitions] = await Promise.all([
    api.museum.bySlug({ slug }),
    api.museum.exhibitions({ slug }),
  ]);
  if (!museum) notFound();

  const today = todayInHelsinki();
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
      <h1 className="text-headline text-4xl">{museum.name}</h1>
      {museum.city && <p className="text-muted mt-1 text-sm">{museum.city}</p>}
      {museum.websiteUrl && (
        <a
          href={museum.websiteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-block text-sm font-semibold underline-offset-2 hover:underline"
        >
          {museum.websiteUrl}
        </a>
      )}

      <section className="border-rule-soft mt-8 border-t pt-8">
        <h2 className="text-headline mb-4 text-2xl">
          {t.pages.museums.current}
        </h2>
        <ExhibitionList
          items={byPhase.current.map((item) => toRowView(item, today))}
          emptyMessage={t.pages.museums.empty}
        />
      </section>

      <section className="border-rule-soft mt-8 border-t pt-8">
        <h2 className="text-headline mb-4 text-2xl">
          {t.pages.museums.upcoming}
        </h2>
        <ExhibitionList
          items={byPhase.upcoming.map((item) => toRowView(item, today))}
          emptyMessage={t.pages.museums.empty}
        />
      </section>

      <section className="border-rule-soft mt-8 border-t pt-8">
        <h2 className="text-headline mb-4 text-2xl">{t.pages.museums.past}</h2>
        <ExhibitionList
          items={byPhase.ended.map((item) => toRowView(item, today))}
          emptyMessage={t.pages.museums.empty}
        />
      </section>
    </div>
  );
}
