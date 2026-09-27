import { type Metadata } from "next";
import Link from "next/link";

import { t } from "~/i18n/fi";
import { api } from "~/trpc/server";

export const metadata: Metadata = {
  title: `${t.pages.museums.title} — ${t.app.name}`,
  description: t.pages.meta.museums,
};

export default async function MuseumsPage() {
  const museums = await api.museum.list();

  return (
    <div className="py-8">
      <h1 className="text-headline mb-6 text-4xl sm:text-5xl">
        {t.pages.museums.title}
      </h1>
      <ul>
        {museums.map((museum) => (
          <li
            key={museum.id}
            className="border-rule-soft border-t first:border-t-0"
          >
            <Link
              href={`/museums/${museum.slug}`}
              className="group flex items-baseline justify-between gap-4 py-3"
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
          </li>
        ))}
      </ul>
    </div>
  );
}
