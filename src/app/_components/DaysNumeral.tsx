import { t } from "~/i18n/fi";

export function DaysNumeral({
  days,
  caption,
}: {
  days: number;
  caption: string;
}) {
  if (days === 0) {
    return (
      <p className="text-signal mt-1 flex h-9 items-end font-serif text-xl leading-tight font-medium italic">
        {t.time.endsToday}
      </p>
    );
  }

  return (
    <p className="text-signal mt-1 flex h-9 items-end">
      <span className="flex items-baseline gap-1.5">
        <span className="font-serif text-4xl leading-none font-medium tabular-nums">
          {days}
        </span>
        <span className="font-sans text-xs font-semibold">{caption}</span>
      </span>
    </p>
  );
}
