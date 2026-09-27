import { RowSkeleton } from "~/app/_components/Skeleton";

export default function MyLoading() {
  return (
    <div>
      {Array.from({ length: 4 }, (_, i) => (
        <RowSkeleton key={i} />
      ))}
    </div>
  );
}
