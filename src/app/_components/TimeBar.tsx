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
  stacked = false,
}: TimeBarProps & { stacked?: boolean }) {
  if (progress === null && !stacked) {
    return <p className="text-muted font-sans text-xs">{remainingLabel}</p>;
  }

  const clamped = progress === null ? 0 : Math.min(100, Math.max(0, progress));
  const remainingClass = urgent ? "text-signal font-semibold" : "text-muted";

  return (
    <div className="font-sans">
      <div
        role={progress === null ? undefined : "progressbar"}
        aria-valuenow={progress === null ? undefined : Math.round(clamped)}
        aria-valuemin={progress === null ? undefined : 0}
        aria-valuemax={progress === null ? undefined : 100}
        aria-label={progress === null ? undefined : remainingLabel}
        className="bg-rule-soft h-0.5 w-full"
      >
        <div
          className={`h-full transition-[width] duration-150 ${urgent ? "bg-signal" : "bg-fg"}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
      {stacked ? (
        <div className="mt-1.5 text-xs leading-snug tabular-nums">
          <p className="text-muted truncate">
            {progress === null ? remainingLabel : `${startLabel}–${endLabel}`}
          </p>
          <p className={`truncate ${remainingClass}`}>
            {progress === null ? " " : remainingLabel}
          </p>
        </div>
      ) : (
        <div className="mt-1.5 flex flex-wrap items-baseline justify-between gap-x-2 text-xs tabular-nums">
          <span className="text-muted">
            {startLabel}–{endLabel}
          </span>
          <span className={remainingClass}>{remainingLabel}</span>
        </div>
      )}
    </div>
  );
}
