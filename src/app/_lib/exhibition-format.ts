import {
  getDaysRemaining,
  getPhase,
  getTimeBarProgress,
  type ExhibitionDates,
} from "~/domain/dates";
import type { TimeBarProps } from "~/app/_components/TimeBar";
import { t } from "~/i18n/fi";

const shortDate = new Intl.DateTimeFormat("fi-FI", {
  day: "numeric",
  month: "numeric",
});
const longDate = new Intl.DateTimeFormat("fi-FI", {
  day: "numeric",
  month: "numeric",
  year: "numeric",
});

const weekday = new Intl.DateTimeFormat("fi-FI", { weekday: "long" });

function parseLocalDate(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00`);
}

export function formatShortDate(isoDate: string): string {
  return shortDate.format(parseLocalDate(isoDate));
}

export function formatLongDate(isoDate: string): string {
  return longDate.format(parseLocalDate(isoDate));
}

/** `sunnuntai 27.9.2026`: `Intl` alone would inflect the weekday ("sunnuntaina"). */
export function formatWeekdayDate(isoDate: string): string {
  const date = parseLocalDate(isoDate);
  return `${weekday.format(date)} ${longDate.format(date)}`;
}

/** `12.9.–31.1.2027`: the start date drops the year when both fall in the same one. */
function dateRangeLabels(startIso: string, endIso: string) {
  const sameYear =
    parseLocalDate(startIso).getFullYear() ===
    parseLocalDate(endIso).getFullYear();
  return {
    startLabel: sameYear ? formatShortDate(startIso) : formatLongDate(startIso),
    endLabel: formatLongDate(endIso),
  };
}

function remainingDaysLabel(daysRemaining: number): {
  label: string;
  urgent: boolean;
} {
  if (daysRemaining === 0) return { label: t.time.endsToday, urgent: true };
  if (daysRemaining === 1)
    return { label: t.time.daysRemainingOne, urgent: true };
  if (daysRemaining <= 14)
    return { label: t.time.daysRemaining(daysRemaining), urgent: true };
  return { label: t.pages.timeBar.daysCompact(daysRemaining), urgent: false };
}

/** Props for the built TimeBar component, covering upcoming, current, ended and open-ended runs. */
export function timeBarProps(
  exhibition: ExhibitionDates,
  today: string,
): TimeBarProps {
  const phase = getPhase(exhibition, today);

  if (exhibition.endDate === null) {
    return {
      progress: null,
      startLabel: "",
      endLabel: "",
      remainingLabel:
        phase === "upcoming"
          ? t.time.startsOn(formatShortDate(exhibition.startDate))
          : t.time.indefinite,
      urgent: false,
    };
  }

  const progress = getTimeBarProgress(exhibition, today);
  const { startLabel, endLabel } = dateRangeLabels(
    exhibition.startDate,
    exhibition.endDate,
  );

  if (phase === "upcoming") {
    return {
      progress,
      startLabel,
      endLabel,
      remainingLabel: t.time.startsOn(formatShortDate(exhibition.startDate)),
      urgent: false,
    };
  }
  if (phase === "ended") {
    return {
      progress,
      startLabel,
      endLabel,
      remainingLabel: t.pages.timeBar.ended(formatLongDate(exhibition.endDate)),
      urgent: false,
    };
  }

  const { label, urgent } = remainingDaysLabel(
    getDaysRemaining(exhibition, today)!,
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
): string | null {
  const phase = getPhase(exhibition, today);
  if (phase === "ended") return null;
  if (phase === "upcoming")
    return t.time.startsOn(formatShortDate(exhibition.startDate));
  if (exhibition.endDate === null) return null;

  const daysRemaining = getDaysRemaining(exhibition, today)!;
  if (daysRemaining === 0) return t.time.endsToday;
  if (daysRemaining === 1) return t.time.daysRemainingOne;
  return t.time.daysRemaining(daysRemaining);
}

export function dayCaption(days: number): string {
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
