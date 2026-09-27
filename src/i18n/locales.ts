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

/**
 * The browser's top language: Finnish and Swedish map to themselves, anything
 * else to English. A request without the header (mostly crawlers) gets Finnish.
 */
export function localeFromAcceptLanguage(
  header: string | null | undefined,
): Locale {
  const top = (header ?? "")
    .split(",")
    .map((part) => {
      const [tag = "", ...params] = part.trim().split(";");
      const q = params.find((param) => param.trim().startsWith("q="));
      return {
        tag: tag.trim().toLowerCase(),
        q: q ? Number(q.trim().slice(2)) : 1,
      };
    })
    .filter(({ tag, q }) => tag && tag !== "*" && q > 0)
    .sort((a, b) => b.q - a.q)[0];
  if (!top) return DEFAULT_LOCALE;
  const language = top.tag.split("-")[0];
  if (language === "fi" || language === "sv") return language;
  return "en";
}

/** Saved choice, then cookie, then the browser's language. */
export function resolveLocale(
  userLocale: string | null | undefined,
  cookieLocale: string | null | undefined,
  acceptLanguage: string | null | undefined,
): Locale {
  if (isLocale(userLocale)) return userLocale;
  if (isLocale(cookieLocale)) return cookieLocale;
  return localeFromAcceptLanguage(acceptLanguage);
}

/** Each language in its own name, the same in every locale. */
export const LOCALE_NAMES: Record<Locale, string> = {
  fi: "Suomi",
  en: "English",
  sv: "Svenska",
};
