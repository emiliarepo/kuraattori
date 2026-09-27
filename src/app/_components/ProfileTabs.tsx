"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { usePendingLink } from "~/app/_components/usePendingLink";
import { useI18n } from "~/i18n/client";

export function ProfileTabs() {
  const { t } = useI18n();
  const TABS = [
    { href: "/settings/interests", label: t.profile.tabs.interests },
    { href: "/settings/regions", label: t.profile.tabs.regions },
    { href: "/settings/calendar", label: t.profile.tabs.calendar },
    { href: "/settings/account", label: t.profile.tabs.account },
  ] as const;
  const pathname = usePathname();
  const { target, onClick } = usePendingLink();

  return (
    <nav
      aria-label={t.ui.nav.profile}
      className="flex [scrollbar-width:none] overflow-x-auto overflow-y-hidden overscroll-x-contain shadow-[inset_0_-1px_0_var(--rule-soft)]"
    >
      {TABS.map((tab) => {
        const active = (target ?? pathname).startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            onClick={onClick}
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
