import { RowSkeleton, Skeleton } from "~/app/_components/Skeleton";

export default function MuseumDetailLoading() {
  return (
    <div className="py-8">
      <Skeleton className="h-12 w-2/3 sm:h-16" />
      <Skeleton className="mt-2 h-6 w-1/3" />
      <div className="border-rule mt-8 border-t pt-5">
        <Skeleton className="mb-4 h-8 w-40" />
        {Array.from({ length: 3 }, (_, i) => (
          <RowSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
