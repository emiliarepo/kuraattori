import {
  getDaysRemaining,
  getPhase,
  getTimeBarProgress,
  type ExhibitionDates,
} from "~/domain/dates";
import { ENDING_SOON_DAYS } from "~/domain/urgency";
import type { TimeBarProps } from "~/app/_components/TimeBar";
import type { I18n } from "~/i18n";
import { formatDate, formatDayMonth, formatWeekday } from "~/i18n/format";
import type { Locale } from "~/i18n/locales";

/** `sunnuntai 27.9.2026`: `Intl` alone would inflect the Finnish weekday ("sunnuntaina"). */
export function formatWeekdayDate(isoDate: string, locale: Locale): string {
  return `${formatWeekday(isoDate, locale)} ${formatDate(isoDate, locale)}`;
}

/** `12.9.–31.1.2027`: the start date drops the year when both fall in the same one. */
function dateRangeLabels(startIso: string, endIso: string, locale: Locale) {
  const sameYear = startIso.slice(0, 4) === endIso.slice(0, 4);
  return {
    startLabel: sameYear
      ? formatDayMonth(startIso, locale)
      : formatDate(startIso, locale),
    endLabel: formatDate(endIso, locale),
  };
}

function remainingDaysLabel(
  daysRemaining: number,
  t: I18n["t"],
): {
  label: string;
  urgent: boolean;
} {
  if (daysRemaining === 0) return { label: t.time.endsToday, urgent: true };
  if (daysRemaining === 1)
    return { label: t.time.daysRemainingOne, urgent: true };
  if (daysRemaining <= ENDING_SOON_DAYS)
    return { label: t.time.daysRemaining(daysRemaining), urgent: true };
  return { label: t.pages.timeBar.daysCompact(daysRemaining), urgent: false };
}

/** Props for the built TimeBar component, covering upcoming, current, ended and open-ended runs. */
export function timeBarProps(
  exhibition: ExhibitionDates,
  today: string,
  { t, locale }: I18n,
): TimeBarProps {
  const phase = getPhase(exhibition, today);

  if (exhibition.endDate === null) {
    return {
      progress: null,
      startLabel: "",
      endLabel: "",
      remainingLabel:
        phase === "upcoming"
          ? t.time.startsOn(formatDayMonth(exhibition.startDate, locale))
          : t.time.indefinite,
      urgent: false,
    };
  }

  const progress = getTimeBarProgress(exhibition, today);
  const { startLabel, endLabel } = dateRangeLabels(
    exhibition.startDate,
    exhibition.endDate,
    locale,
  );

  if (phase === "upcoming") {
    return {
      progress,
      startLabel,
      endLabel,
      remainingLabel: t.time.startsOn(
        formatDayMonth(exhibition.startDate, locale),
      ),
      urgent: false,
    };
  }
  if (phase === "ended") {
    return {
      progress,
      startLabel,
      endLabel,
      remainingLabel: t.pages.timeBar.ended(
        formatDate(exhibition.endDate, locale),
      ),
      urgent: false,
    };
  }

  const { label, urgent } = remainingDaysLabel(
    getDaysRemaining(exhibition, today)!,
    t,
  );
  return { progress, startLabel, endLabel, remainingLabel: label, urgent };
}

/**
 * Always-verbose remaining-time text for UrgencyLabel (lead story, detail page),
 * independent of TimeBar's urgency cutoff. Null when there's nothing to say
 * (an open-ended run already under way).
 */
export function urgencyLabelText(
  exhibition: ExhibitionDates,
  today: string,
  { t, locale }: I18n,
): string | null {
  const phase = getPhase(exhibition, today);
  if (phase === "ended") return null;
  if (phase === "upcoming")
    return t.time.startsOn(formatDayMonth(exhibition.startDate, locale));
  if (exhibition.endDate === null) return null;

  const daysRemaining = getDaysRemaining(exhibition, today)!;
  if (daysRemaining === 0) return t.time.endsToday;
  if (daysRemaining === 1) return t.time.daysRemainingOne;
  return t.time.daysRemaining(daysRemaining);
}

/**
 * Trip mode's "why" kicker: closing during the trip takes priority over
 * opening during it, since it's the more actionable thing to know.
 */
export function tripWhyLabel(
  exhibition: ExhibitionDates,
  from: string,
  to: string,
  { t, locale }: I18n,
  endingSoon = false,
): string | null {
  if (exhibition.endDate !== null && exhibition.endDate >= from) {
    if (exhibition.endDate <= to) return t.pages.trip.endsDuringTrip;
    if (endingSoon)
      return t.pages.trip.endsAfterTrip(
        formatDayMonth(exhibition.endDate, locale),
      );
  }
  if (exhibition.startDate >= from && exhibition.startDate <= to) {
    return t.pages.trip.opensDuringTrip(
      formatDayMonth(exhibition.startDate, locale),
    );
  }
  return null;
}

export function dayCaption(days: number, { t }: I18n): string {
  return t.pages.days.caption(days);
}

export function excerpt(text: string, maxLength = 180): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (trimmed.length <= maxLength) return trimmed;
  const cut = trimmed.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : cut).replace(/[,.;:–-]+$/, "")}…`;
}

export function imageAlt(title: string, museumName: string): string {
  return `${title}, ${museumName}`;
}
