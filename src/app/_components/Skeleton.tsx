/**
 * Static `--surface` placeholder blocks for `loading.tsx` states, sized to
 * match the real card/row line budget (docs/design.md). No shimmer or
 * looping animation, per the design's motion rule.
 */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`bg-surface ${className}`} />;
}

export function CardSkeleton() {
  return (
    <div className="flex h-full w-full flex-col gap-1.5">
      <Skeleton className="aspect-[4/5] w-full" />
      <Skeleton className="h-3 w-2/3" />
      <Skeleton className="h-5 w-full" />
      <Skeleton className="h-3 w-1/2" />
      <Skeleton className="mt-auto h-2 w-full" />
    </div>
  );
}

export function RowSkeleton() {
  return (
    <div className="border-rule-soft flex gap-4 border-t py-5 first:border-t-0 sm:gap-6">
      <Skeleton className="aspect-[4/3] w-24 flex-shrink-0 sm:w-40" />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-3 w-1/4" />
        <Skeleton className="mt-1 h-2 w-full max-w-sm" />
      </div>
    </div>
  );
}
