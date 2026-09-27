"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { isNavItemActive, NAV_ITEMS } from "~/app/_components/nav";
import { t } from "~/i18n/fi";

export function BottomTabBar({
  omatEndingSoonCount = 0,
}: {
  omatEndingSoonCount?: number;
}) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Päänavigaatio"
      className="border-rule-soft bg-bg standalone:pb-[max(0.75rem,env(safe-area-inset-bottom))] fixed inset-x-0 bottom-0 z-10 flex border-t pb-[env(safe-area-inset-bottom)] font-sans sm:hidden"
    >
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
            className={`flex min-h-11 min-w-0 flex-1 items-center justify-center border-t-2 px-1 py-3 text-center text-[0.8125rem] transition-colors duration-150 ${
              active
                ? "border-t-signal text-signal font-semibold"
                : "border-t-transparent"
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
