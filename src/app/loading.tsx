import { CardSkeleton, Skeleton } from "~/app/_components/Skeleton";

function RailSkeleton() {
  return (
    <section className="border-rule mt-10 border-t pt-3">
      <Skeleton className="mb-4 h-8 w-40" />
      <div className="-mx-4 flex gap-3 overflow-hidden px-4 sm:-mx-6 sm:gap-5 sm:px-6">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="w-[40vw] flex-none sm:w-52">
            <CardSkeleton />
          </div>
        ))}
      </div>
    </section>
  );
}

export default function HomeLoading() {
  return (
    <div className="pt-6 sm:pt-8">
      <div className="grid gap-4 sm:grid-cols-[3fr_2fr] sm:items-end sm:gap-8">
        <Skeleton className="aspect-[3/2] w-full" />
        <div className="flex flex-col gap-2 sm:pb-1">
          <Skeleton className="h-3 w-1/3" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-5 w-1/2" />
        </div>
      </div>
      <RailSkeleton />
      <RailSkeleton />
      <RailSkeleton />
    </div>
  );
}
