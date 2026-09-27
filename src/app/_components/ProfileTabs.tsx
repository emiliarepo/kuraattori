"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { t } from "~/i18n/fi";

const TABS = [
  { href: "/profile/interests", label: t.profile.tabs.interests },
  { href: "/profile/regions", label: t.profile.tabs.regions },
  { href: "/profile/calendar", label: t.profile.tabs.calendar },
  { href: "/profile/account", label: t.profile.tabs.account },
] as const;

export function ProfileTabs() {
  const pathname = usePathname();

  return (
    <nav
      aria-label={t.ui.nav.profile}
      className="border-rule-soft flex border-b"
    >
      {TABS.map((tab) => {
        const active = pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`text-kicker -mb-px border-b-2 px-3 py-3 whitespace-nowrap transition-colors duration-150 first:pl-0 sm:px-4 ${
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
