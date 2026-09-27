import { EmptyState } from "~/app/_components/EmptyState";
import { ExhibitionRow } from "~/app/_components/ExhibitionRow";
import { type ExhibitionRowView } from "~/app/_lib/row";

export function ExhibitionList({
  items,
  emptyMessage,
  className,
}: {
  items: readonly ExhibitionRowView[];
  emptyMessage: string;
  className?: string;
}) {
  if (items.length === 0) return <EmptyState message={emptyMessage} />;

  return (
    <ul className={className}>
      {items.map((item) => (
        <ExhibitionRow key={item.href} {...item} />
      ))}
    </ul>
  );
}
