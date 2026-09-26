export function DaysNumeral({
  days,
  caption,
}: {
  days: number;
  caption: string;
}) {
  return (
    <div className="flex flex-col items-center leading-none">
      <span className="text-headline text-4xl tabular-nums">{days}</span>
      <span className="text-muted mt-1 text-xs">{caption}</span>
    </div>
  );
}
