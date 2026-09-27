"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { isNavItemActive, NAV_ITEMS } from "~/app/_components/nav";
import { t } from "~/i18n/fi";

export function DesktopNav({
  omatEndingSoonCount = 0,
}: {
  omatEndingSoonCount?: number;
}) {
  const pathname = usePathname();

  return (
    <nav aria-label="Päänavigaatio" className="hidden gap-6 sm:flex">
      {NAV_ITEMS.map((item) => {
        const active = isNavItemActive(item.href, pathname);
        const showDot = item.key === "mine" && omatEndingSoonCount > 0;
        return (
          <Link
            key={item.key}
            href={item.href}
            aria-current={active ? "page" : undefined}
            aria-label={
              showDot ? t.ui.nav.omatEndingSoon(omatEndingSoonCount) : undefined
            }
            className={`text-kicker hover:text-signal transition-colors duration-150 ${
              active ? "text-signal" : ""
            }`}
          >
            {item.label}
            {showDot && (
              <span
                aria-hidden="true"
                className="bg-signal ml-1 inline-block h-1.5 w-1.5 rounded-full align-middle"
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
