import { Skeleton } from "~/app/_components/Skeleton";

export default function ExhibitionDetailLoading() {
  return (
    <div className="py-6 sm:py-8">
      <Skeleton className="h-3 w-1/2" />
      <div className="mt-4 flex max-w-4xl flex-col gap-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-12 w-full sm:h-16" />
        <Skeleton className="h-6 w-1/2" />
      </div>
      <div className="mt-6 grid gap-8 sm:grid-cols-[1.6fr_1fr] sm:gap-10">
        <Skeleton className="aspect-[3/2] w-full sm:col-start-1" />
        <div className="flex flex-col gap-3 sm:col-start-2 sm:row-span-2 sm:row-start-1">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-2 w-full" />
          <Skeleton className="h-11 w-full" />
        </div>
      </div>
    </div>
  );
}
