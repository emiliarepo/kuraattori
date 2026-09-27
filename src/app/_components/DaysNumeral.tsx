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
      <div className="flex flex-col items-center justify-center leading-none">
        <span className="text-headline text-center text-lg">
          {t.time.endsToday}
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center leading-none">
      <span className="text-headline text-4xl tabular-nums">{days}</span>
      <span className="text-muted mt-1 text-xs">{caption}</span>
    </div>
  );
}
