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
    return <p className="text-muted text-sm">{remainingLabel}</p>;
  }

  const clamped = Math.min(100, Math.max(0, progress));

  return (
    <div>
      <div
        role="progressbar"
        aria-valuenow={Math.round(clamped)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={remainingLabel}
        className="bg-rule-soft h-1 w-full"
      >
        <div
          className={`h-full transition-[width] duration-150 ${urgent ? "bg-signal" : "bg-fg"}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
      <div className="mt-1 flex items-baseline justify-between gap-2 text-sm tabular-nums">
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
