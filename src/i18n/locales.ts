export const LOCALES = ["fi", "en", "sv"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "fi";
export const LOCALE_COOKIE = "kuraattori_locale";

/** `Intl` tag per locale: English and Swedish as used in Finland. */
export const INTL_LOCALE: Record<Locale, string> = {
  fi: "fi-FI",
  en: "en-FI",
  sv: "sv-FI",
};

export function isLocale(value: unknown): value is Locale {
  return (LOCALES as readonly unknown[]).includes(value);
}

/** Saved choice, then cookie, then Finnish. `Accept-Language` is deliberately ignored. */
export function resolveLocale(
  userLocale: string | null | undefined,
  cookieLocale: string | null | undefined,
): Locale {
  if (isLocale(userLocale)) return userLocale;
  if (isLocale(cookieLocale)) return cookieLocale;
  return DEFAULT_LOCALE;
}

/** Each language in its own name, the same in every locale. */
export const LOCALE_NAMES: Record<Locale, string> = {
  fi: "Suomi",
  en: "English",
  sv: "Svenska",
};
