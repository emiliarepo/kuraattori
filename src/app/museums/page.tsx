import { type Metadata } from "next";
import { HoverPrefetchLink } from "~/app/_components/HoverPrefetchLink";

import { FollowToggle } from "~/app/_components/FollowToggle";
import { localized } from "~/domain/localized";
import { getI18n } from "~/i18n/server";
import { INTL_LOCALE } from "~/i18n/locales";
import { auth } from "~/server/auth";
import { api } from "~/trpc/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return {
    title: `${t.pages.museums.title} — ${t.app.name}`,
    description: t.pages.meta.museums,
  };
}

export default async function MuseumsPage() {
  const { t, locale } = await getI18n();
  const [museums, session] = await Promise.all([api.museum.list(), auth()]);
  const signedIn = Boolean(session?.user);
  const followed = signedIn ? await api.museum.followed() : [];
  const followedIds = new Set(followed.map((entry) => entry.id));
  const collator = new Intl.Collator(INTL_LOCALE[locale]);
  const rows = museums
    .map((museum) => ({ museum, name: localized(museum, "name", locale) }))
    .sort((a, b) => collator.compare(a.name.text, b.name.text));

  return (
    <div className="py-8">
      <h1 className="text-headline mb-6 text-4xl sm:text-5xl">
        {t.pages.museums.title}
      </h1>
      <ul>
        {rows.map(({ museum, name }) => (
          <li
            key={museum.id}
            className="border-rule-soft flex items-baseline justify-between gap-4 border-t py-3 first:border-t-0 first:pt-0"
          >
            <HoverPrefetchLink
              href={`/museums/${museum.slug}`}
              className="group flex flex-1 items-baseline justify-between gap-4"
            >
              <span
                lang={name.lang}
                className="text-lg group-hover:underline group-hover:decoration-1 group-hover:underline-offset-4"
              >
                {name.text}
              </span>
              {museum.city && (
                <span className="text-muted flex-none font-sans text-xs">
                  {museum.city}
                </span>
              )}
            </HoverPrefetchLink>
            {signedIn && (
              <FollowToggle
                museumId={museum.id}
                museumName={name.text}
                initialFollowing={followedIds.has(museum.id)}
              />
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
