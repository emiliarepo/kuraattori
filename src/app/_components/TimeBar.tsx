export type TimeBarProps = {
  progress: number | null;
  startLabel: string;
  endLabel: string;
  remainingLabel: string;
  urgent: boolean;
};

export function TimeBar({
  progress,
  startLabel,
  endLabel,
  remainingLabel,
  urgent,
}: TimeBarProps) {
  if (progress === null) {
    return <p className="text-muted font-sans text-xs">{remainingLabel}</p>;
  }

  const clamped = Math.min(100, Math.max(0, progress));

  return (
    <div className="font-sans">
      <div
        role="progressbar"
        aria-valuenow={Math.round(clamped)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={remainingLabel}
        className="bg-rule-soft h-0.5 w-full"
      >
        <div
          className={`h-full transition-[width] duration-150 ${urgent ? "bg-signal" : "bg-fg"}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
      <div className="mt-1.5 flex flex-wrap items-baseline justify-between gap-x-2 text-xs tabular-nums">
        <span className="text-muted">
          {startLabel}–{endLabel}
        </span>
        <span className={urgent ? "text-signal font-semibold" : "text-muted"}>
          {remainingLabel}
        </span>
      </div>
    </div>
  );
}
