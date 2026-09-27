"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { MY_SORTS, sortForStatus, type MyStatus } from "~/domain/my-sort";
import { t } from "~/i18n/fi";

const TABS = [
  { href: "/my/interested", label: t.pages.my.interested },
  { href: "/my/visited", label: t.pages.my.visited },
  { href: "/my/hidden", label: t.pages.my.hidden },
] as const;

export function MyTabs() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const status = pathname.split("/")[2] as MyStatus | undefined;
  const sort =
    status && status in MY_SORTS
      ? sortForStatus(status, searchParams.get("sort"))
      : null;

  return (
    <div className="border-rule-soft flex flex-col border-b lg:flex-row lg:items-center lg:justify-between">
      <nav aria-label={t.ui.nav.mine} className="flex">
        {TABS.map((tab) => {
          const active = pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={`text-kicker -mb-px border-b-2 px-3 py-3.5 whitespace-nowrap transition-colors duration-150 first:pl-0 focus-visible:-outline-offset-2 sm:px-4 ${
                active ? "border-b-signal text-signal" : "border-b-transparent"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
      {status && status in MY_SORTS && sort && (
        <label className="text-kicker flex items-center gap-2 self-end py-2 lg:self-auto lg:py-0">
          {t.pages.my.sortLabel}
          <select
            value={sort}
            onChange={(event) => {
              const next = event.target.value;
              const params = new URLSearchParams(searchParams);
              if (next === MY_SORTS[status][0]) params.delete("sort");
              else params.set("sort", next);
              const query = params.toString();
              router.push(query ? `${pathname}?${query}` : pathname, {
                scroll: false,
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
      )}
    </div>
  );
}
