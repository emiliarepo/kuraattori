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
      <h1 className="text-headline mb-6 text-4xl">{t.pages.museums.title}</h1>
      <ul>
        {museums.map((museum) => (
          <li
            key={museum.id}
            className="border-rule-soft border-t first:border-t-0"
          >
            <Link
              href={`/museums/${museum.slug}`}
              className="hover:bg-surface flex items-baseline justify-between gap-4 py-4"
            >
              <span className="font-semibold">{museum.name}</span>
              {museum.city && (
                <span className="text-muted text-sm">{museum.city}</span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
