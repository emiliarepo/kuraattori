"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useI18n } from "~/i18n/client";

export function ProfileTabs() {
  const { t } = useI18n();
  const TABS = [
    { href: "/profile/interests", label: t.profile.tabs.interests },
    { href: "/profile/regions", label: t.profile.tabs.regions },
    { href: "/profile/calendar", label: t.profile.tabs.calendar },
    { href: "/profile/year", label: t.profile.tabs.year },
    { href: "/profile/account", label: t.profile.tabs.account },
  ] as const;
  const pathname = usePathname();

  return (
    <nav
      aria-label={t.ui.nav.profile}
      className="flex [scrollbar-width:none] overflow-x-auto overflow-y-hidden overscroll-x-contain shadow-[inset_0_-1px_0_var(--rule-soft)]"
    >
      {TABS.map((tab) => {
        const active = pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`text-kicker border-b-2 px-3 py-3.5 whitespace-nowrap transition-colors duration-150 first:pl-0 focus-visible:-outline-offset-2 sm:px-4 ${
              active ? "border-b-signal text-signal" : "border-b-transparent"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
