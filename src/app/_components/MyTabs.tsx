"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useOptimistic } from "react";

import { usePendingNavigation } from "~/app/_components/PendingNavigation";

import { usePendingLink } from "~/app/_components/usePendingLink";
import { MY_SORTS, sortForStatus, type MyStatus } from "~/domain/my-sort";
import { useI18n } from "~/i18n/client";

export function MyTabs() {
  const { t } = useI18n();
  const TABS = [
    { href: "/my/interested", label: t.pages.my.interested },
    { href: "/my/visited", label: t.pages.my.visited },
    { href: "/my/passport", label: t.pages.my.passport.tab },
    { href: "/my/hidden", label: t.pages.my.hidden },
  ] as const;
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const status = pathname.split("/")[2] as MyStatus | undefined;
  const sort =
    status && status in MY_SORTS
      ? sortForStatus(status, searchParams.get("sort"))
      : null;
  const { pending, start } = usePendingNavigation();
  const { target, onClick } = usePendingLink();
  const [shownSort, setShownSort] = useOptimistic(sort);

  return (
    <div className="border-rule-soft flex flex-col border-b lg:flex-row lg:items-center lg:justify-between">
      <nav
        aria-label={t.ui.nav.mine}
        className="flex justify-between sm:justify-start"
      >
        {TABS.map((tab) => {
          const active = (target ?? pathname).startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              onClick={onClick}
              aria-current={active ? "page" : undefined}
              className={`text-kicker -mb-px border-b-2 py-3.5 whitespace-nowrap transition-colors duration-150 focus-visible:-outline-offset-2 sm:px-4 sm:first:pl-0 ${
                active ? "border-b-signal text-signal" : "border-b-transparent"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
      {status && status in MY_SORTS && sort && (
        <div className="flex items-center gap-3 self-end py-2 lg:self-auto lg:py-0">
          <span role="status" className="text-muted font-sans text-xs">
            {pending ? t.ui.updating : ""}
          </span>
          <label className="text-kicker flex items-center gap-2">
            {t.pages.my.sortLabel}
            <select
              value={shownSort ?? undefined}
              onChange={(event) => {
                const next = event.target.value as NonNullable<typeof sort>;
                const params = new URLSearchParams(searchParams);
                if (next === MY_SORTS[status][0]) params.delete("sort");
                else params.set("sort", next);
                const query = params.toString();
                start(() => {
                  setShownSort(next);
                  router.push(query ? `${pathname}?${query}` : pathname, {
                    scroll: false,
                  });
                });
              }}
              className="border-rule-soft bg-bg text-fg focus:border-fg h-11 border px-2 text-sm font-normal tracking-normal normal-case lg:h-9"
            >
              {MY_SORTS[status].map((option) => (
                <option key={option} value={option}>
                  {t.pages.my.sortOptions[option]}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
    </div>
  );
}
