export function StatFigure({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <p className="text-headline text-4xl tabular-nums sm:text-5xl">{value}</p>
      <p className="text-kicker text-muted mt-1">{label}</p>
    </div>
  );
}
