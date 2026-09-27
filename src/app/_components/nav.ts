import { t } from "~/i18n/fi";

export type NavKey = "home" | "browse" | "trip" | "mine" | "profile";

export const NAV_ITEMS: readonly {
  key: NavKey;
  label: string;
  href: string;
}[] = [
  { key: "home", label: t.ui.nav.home, href: "/" },
  { key: "browse", label: t.ui.nav.browse, href: "/exhibitions" },
  { key: "trip", label: t.ui.nav.trip, href: "/trip" },
  { key: "mine", label: t.ui.nav.mine, href: "/my" },
  { key: "profile", label: t.ui.nav.profile, href: "/profile" },
];

export function isNavItemActive(href: string, pathname: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}
