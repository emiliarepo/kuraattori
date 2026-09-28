import { type Metadata } from "next";

import { ExhibitionList } from "~/app/_components/ExhibitionList";
import { toRowView } from "~/app/_lib/row";
import { todayInHelsinki } from "~/domain/dates";
import { getI18n } from "~/i18n/server";
import { auth } from "~/server/auth";
import { getActiveRegions } from "~/server/regions-preference";
import { api } from "~/trpc/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: `${t.pages.home.new} — ${t.app.name}` };
}

export default async function NewExhibitionsPage() {
  const i18n = await getI18n();
  const { t } = i18n;
  const today = todayInHelsinki();
  const [session, regions] = await Promise.all([auth(), getActiveRegions()]);
  const items = await api.exhibition
    .new({ regions: [...regions], limit: 50 })
    .catch(() => []);
  return (
    <div className="py-8">
      <h1 className="text-headline mb-6 text-4xl sm:text-5xl">
        {t.pages.home.new}
      </h1>
      <ExhibitionList
        items={items.map((item) => toRowView(item, today, i18n))}
        emptyMessage={t.pages.browse.empty}
        signedIn={Boolean(session?.user)}
      />
    </div>
  );
}
