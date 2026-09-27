export type NavKey = "home" | "browse" | "trip" | "mine" | "profile";

export const NAV_ITEMS: readonly { key: NavKey; href: string }[] = [
  { key: "home", href: "/" },
  { key: "browse", href: "/exhibitions" },
  { key: "trip", href: "/trip" },
  { key: "mine", href: "/my" },
  { key: "profile", href: "/settings" },
];

export function isNavItemActive(href: string, pathname: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}
