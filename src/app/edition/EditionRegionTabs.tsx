"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOptimistic } from "react";

import { usePendingNavigation } from "~/app/_components/PendingNavigation";
import { EDITION_REGIONS } from "~/domain/edition";
import { useI18n } from "~/i18n/client";

export function EditionRegionTabs({ active }: { active: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const { pending, start } = usePendingNavigation();
  const [shown, setShown] = useOptimistic(active);

  return (
    <div className="border-rule-soft flex items-center justify-between gap-3 border-b">
      <nav aria-label={t.pages.edition.regions} className="flex">
        {EDITION_REGIONS.map(({ slug, region }) => {
          const current = slug === shown;
          return (
            <Link
              key={slug}
              href={`/edition/${slug}`}
              aria-current={current ? "page" : undefined}
              onClick={(event) => {
                if (event.metaKey || event.ctrlKey || event.shiftKey) return;
                event.preventDefault();
                start(() => {
                  setShown(slug);
                  router.push(`/edition/${slug}`);
                });
              }}
              className={`text-kicker -mb-px flex min-h-11 items-center border-b-2 px-3 whitespace-nowrap transition-colors duration-150 first:pl-0 focus-visible:-outline-offset-2 sm:px-4 ${
                current ? "border-b-signal text-signal" : "border-b-transparent"
              }`}
            >
              {t.regionName(region)}
            </Link>
          );
        })}
      </nav>
      <span role="status" className="text-muted font-sans text-xs">
        {pending ? t.ui.updating : ""}
      </span>
    </div>
  );
}
