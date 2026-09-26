import { t } from "~/i18n/fi";

export type NavKey = "koti" | "selaa" | "omat" | "profiili";

export const NAV_ITEMS: readonly {
  key: NavKey;
  label: string;
  href: string;
}[] = [
  { key: "koti", label: t.ui.nav.koti, href: "/" },
  { key: "selaa", label: t.ui.nav.selaa, href: "/nayttelyt" },
  { key: "omat", label: t.ui.nav.omat, href: "/omat" },
  { key: "profiili", label: t.ui.nav.profiili, href: "/profiili" },
];
