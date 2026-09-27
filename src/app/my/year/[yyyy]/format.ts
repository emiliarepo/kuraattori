import { INTL_LOCALE, type Locale } from "~/i18n/locales";

function monthDate(month: number): Date {
  return new Date(Date.UTC(2024, month - 1, 1));
}

export function monthLabel(month: number, locale: Locale): string {
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    month: "short",
    timeZone: "UTC",
  }).format(monthDate(month));
}

export function monthName(month: number, locale: Locale): string {
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    month: "long",
    timeZone: "UTC",
  }).format(monthDate(month));
}

export function formatVisitDate(visitedAt: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    timeZone: "Europe/Helsinki",
    day: "numeric",
    month: "numeric",
    year: "numeric",
  }).format(visitedAt);
}
