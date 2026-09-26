const FINNISH_DATE = /(\d{1,2})\.(\d{1,2})\.(\d{4})/;
const DATE_RANGE = new RegExp(
  `^${FINNISH_DATE.source}\\s*[–-]\\s*(?:${FINNISH_DATE.source})?$`,
);

function toIso(day: string, month: string, year: string): string {
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

export interface DateRange {
  startDate: string;
  endDate: string | undefined;
}

/**
 * Parses museot.fi's "D.M.YYYY – D.M.YYYY" date ranges, including the
 * open-ended form ("D.M.YYYY – ") for exhibitions with no announced end date.
 */
export function parseDateRange(text: string): DateRange | undefined {
  const match = DATE_RANGE.exec(text.trim());
  if (!match) return undefined;
  const [, startDay, startMonth, startYear, endDay, endMonth, endYear] = match;
  if (!startDay || !startMonth || !startYear) return undefined;
  return {
    startDate: toIso(startDay, startMonth, startYear),
    endDate:
      endDay && endMonth && endYear
        ? toIso(endDay, endMonth, endYear)
        : undefined,
  };
}
