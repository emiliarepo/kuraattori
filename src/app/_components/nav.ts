export type NavKey = "home" | "browse" | "trip" | "mine" | "profile";

export const NAV_ITEMS: readonly { key: NavKey; href: string }[] = [
  { key: "home", href: "/feed" },
  { key: "browse", href: "/exhibitions" },
  { key: "trip", href: "/trip" },
  { key: "mine", href: "/my" },
  { key: "profile", href: "/settings" },
];

export function isNavItemActive(href: string, pathname: string): boolean {
  if (href === "/feed") return pathname === "/" || pathname === "/feed";
  return pathname.startsWith(href);
}
