/** Puts selected items first (in their original order), then the rest. */
export function groupBySelection<T extends { id: number }>(
  items: readonly T[],
  selectedIds: ReadonlySet<number>,
): { selected: T[]; rest: T[] } {
  const selected: T[] = [];
  const rest: T[] = [];
  for (const item of items) {
    (selectedIds.has(item.id) ? selected : rest).push(item);
  }
  return { selected, rest };
}
