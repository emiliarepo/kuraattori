import { type Metadata } from "next";
import Link from "next/link";

import { FollowToggle } from "~/app/_components/FollowToggle";
import { t } from "~/i18n/fi";
import { auth } from "~/server/auth";
import { api } from "~/trpc/server";

export const metadata: Metadata = {
  title: `${t.pages.museums.title} — ${t.app.name}`,
  description: t.pages.meta.museums,
};

export default async function MuseumsPage() {
  const [museums, session] = await Promise.all([api.museum.list(), auth()]);
  const signedIn = Boolean(session?.user);
  const followed = signedIn ? await api.museum.followed() : [];
  const followedIds = new Set(followed.map((entry) => entry.id));

  return (
    <div className="py-8">
      <h1 className="text-headline mb-6 text-4xl sm:text-5xl">
        {t.pages.museums.title}
      </h1>
      <ul>
        {museums.map((museum) => (
          <li
            key={museum.id}
            className="border-rule-soft flex items-baseline justify-between gap-4 border-t py-3 first:border-t-0"
          >
            <Link
              href={`/museums/${museum.slug}`}
              className="group flex flex-1 items-baseline justify-between gap-4"
            >
              <span className="text-lg group-hover:underline group-hover:decoration-1 group-hover:underline-offset-4">
                {museum.name}
              </span>
              {museum.city && (
                <span className="text-muted flex-none font-sans text-xs">
                  {museum.city}
                </span>
              )}
            </Link>
            {signedIn && (
              <FollowToggle
                museumId={museum.id}
                museumName={museum.name}
                initialFollowing={followedIds.has(museum.id)}
              />
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
