import { t as en } from "./en";
import { t as fi, type Messages } from "./fi";
import { type Locale } from "./locales";
import { t as sv } from "./sv";

export type { Messages };

export interface I18n {
  locale: Locale;
  t: Messages;
}

const I18N: Record<Locale, I18n> = {
  fi: { locale: "fi", t: fi },
  en: { locale: "en", t: en },
  sv: { locale: "sv", t: sv },
};

export function i18nFor(locale: Locale): I18n {
  return I18N[locale];
}
