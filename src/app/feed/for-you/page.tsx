import { type Metadata } from "next";
import { redirect } from "next/navigation";

import { ExhibitionList } from "~/app/_components/ExhibitionList";
import { forYouToRowView } from "~/app/_lib/row";
import { todayInHelsinki } from "~/domain/dates";
import { getI18n } from "~/i18n/server";
import { auth } from "~/server/auth";
import { signInHereUrl } from "~/server/request-path";
import { api } from "~/trpc/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: `${t.pages.home.forYou} — ${t.app.name}` };
}

export default async function ForYouPage() {
  const session = await auth();
  if (!session?.user) redirect(await signInHereUrl("/feed/for-you"));
  const i18n = await getI18n();
  const { t, locale } = i18n;
  const today = todayInHelsinki();
  const items = await api.recommendation
    .forYou({ limit: 50, locale })
    .catch(() => []);
  return (
    <div className="py-8">
      <h1 className="text-headline mb-6 text-4xl sm:text-5xl">
        {t.pages.home.forYou}
      </h1>
      <ExhibitionList
        items={items.map((item) => forYouToRowView(item, today, i18n))}
        emptyMessage={t.pages.browse.empty}
        signedIn
      />
    </div>
  );
}
