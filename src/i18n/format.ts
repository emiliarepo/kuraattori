import type { I18n } from ".";
import { INTL_LOCALE, type Locale } from "./locales";

function parseIsoDate(isoDate: string): number {
  const year = Number(isoDate.slice(0, 4));
  const month = Number(isoDate.slice(5, 7));
  const day = Number(isoDate.slice(8, 10));
  return Date.UTC(year, month - 1, day);
}

const formatters = new Map<string, Intl.DateTimeFormat>();

/** One cached UTC `Intl.DateTimeFormat` per locale and option set. */
function dateFormat(
  locale: Locale,
  options: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormat {
  const key = `${locale}:${JSON.stringify(options)}`;
  let formatter = formatters.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(INTL_LOCALE[locale], {
      timeZone: "UTC",
      ...options,
    });
    formatters.set(key, formatter);
  }
  return formatter;
}

/** `27.9.2026` / `27/09/2026` */
export function formatDate(isoDate: string, locale: Locale): string {
  return dateFormat(locale, {
    day: "numeric",
    month: "numeric",
    year: "numeric",
  }).format(parseIsoDate(isoDate));
}

/** `pe 2.10.` / `Fri, 02/10` */
export function formatWeekdayDate(isoDate: string, locale: Locale): string {
  return dateFormat(locale, {
    weekday: "short",
    day: "numeric",
    month: "numeric",
  }).format(parseIsoDate(isoDate));
}

/** `2.10.` / `02/10` */
export function formatDayMonth(isoDate: string, locale: Locale): string {
  return dateFormat(locale, { day: "numeric", month: "numeric" }).format(
    parseIsoDate(isoDate),
  );
}

/** `sunnuntai` / `Sunday` */
export function formatWeekday(isoDate: string, locale: Locale): string {
  return dateFormat(locale, { weekday: "long" }).format(parseIsoDate(isoDate));
}

/** `3 päivää jäljellä` / `3 days left` / `Ends today`. `daysRemaining` must be >= 0. */
export function formatDaysRemaining(
  daysRemaining: number,
  { t }: I18n,
): string {
  if (daysRemaining === 0) return t.time.endsToday;
  if (daysRemaining === 1) return t.time.daysRemainingOne;
  return t.time.daysRemaining(daysRemaining);
}

/** `Alkaa 2.10.` / `Opens 02/10` */
export function formatUpcomingStart(startDate: string, i18n: I18n): string {
  return i18n.t.time.startsOn(formatDayMonth(startDate, i18n.locale));
}
