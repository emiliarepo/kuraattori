import { t } from "~/i18n/fi";

export function DaysNumeral({
  days,
  caption,
}: {
  days: number;
  caption: string;
}) {
  return (
    <p className="text-signal mt-1 flex h-9 items-end font-serif text-xl leading-tight font-medium italic tabular-nums">
      {days === 0 ? t.time.endsToday : `${days} ${caption}`}
    </p>
  );
}
