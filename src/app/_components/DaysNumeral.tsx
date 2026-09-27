import { getI18n } from "~/i18n/server";

export async function DaysNumeral({
  days,
  caption,
}: {
  days: number;
  caption: string;
}) {
  const { t } = await getI18n();
  return (
    <p className="text-signal mt-1 flex h-9 items-end font-serif text-xl leading-tight font-medium italic tabular-nums">
      {days === 0 ? t.time.endsToday : `${days} ${caption}`}
    </p>
  );
}
