import { RowSkeleton, Skeleton } from "~/app/_components/Skeleton";

export default function BrowseLoading() {
  return (
    <div className="py-8 sm:grid sm:grid-cols-[15rem_1fr] sm:items-start sm:gap-x-10">
      <div className="mb-6 flex items-baseline justify-between gap-4 sm:col-span-2">
        <Skeleton className="h-10 w-40 sm:h-12" />
      </div>
      <aside className="mb-4 hidden sm:mb-0 sm:block">
        <Skeleton className="h-96 w-full" />
      </aside>
      <div>
        {Array.from({ length: 6 }, (_, i) => (
          <RowSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
