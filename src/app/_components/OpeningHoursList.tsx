import {
  formatHours,
  nextFreeDay,
  weekdayIndex,
  type OpeningHours,
} from "~/domain/opening-hours";
import { t } from "~/i18n/fi";
import { formatDayMonth } from "~/i18n/format";

export function OpeningHoursList({
  hours,
  freeDays,
  today,
}: {
  hours: OpeningHours | null;
  freeDays: readonly string[] | null;
  today: string;
}) {
  const freeDay = nextFreeDay(freeDays, today);
  if (!hours && !freeDay) return null;
  const todayIndex = weekdayIndex(today);

  return (
    <section aria-labelledby="opening-hours" className="mt-6 max-w-sm">
      <h2 id="opening-hours" className="text-kicker text-muted mb-2">
        {t.pages.hours.title}
      </h2>
      {hours && (
        <dl className="divide-rule-soft border-rule-soft divide-y border-y font-sans text-sm tabular-nums">
          {hours.days.map((day, index) => {
            const isToday = index === todayIndex;
            return (
              <div
                key={index}
                aria-current={isToday ? "date" : undefined}
                className={`flex justify-between gap-4 py-1.5 ${isToday ? "font-semibold" : ""}`}
              >
                <dt>
                  {t.pages.hours.weekdays[index]}
                  {isToday && (
                    <span className="text-muted ml-2 font-normal">
                      {t.pages.hours.today}
                    </span>
                  )}
                </dt>
                <dd>{day ? formatHours(day) : t.pages.hours.closed}</dd>
              </div>
            );
          })}
        </dl>
      )}
      {hours?.note && (
        <p className="text-muted mt-2 font-sans text-xs break-words">
          {hours.note}
        </p>
      )}
      {freeDay && (
        <p className="mt-2 font-sans text-sm">
          {t.pages.hours.nextFreeDay(formatDayMonth(freeDay))}
        </p>
      )}
    </section>
  );
}
