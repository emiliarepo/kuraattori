export const MY_SORTS = {
  interested: ["ending", "added", "opening", "name"],
  visited: ["visited-newest", "visited-oldest", "name"],
  hidden: ["hidden-newest", "name"],
} as const;

export type MyStatus = keyof typeof MY_SORTS;
export type MySort = (typeof MY_SORTS)[MyStatus][number];

export function sortForStatus(status: MyStatus, value: unknown): MySort {
  const options: readonly string[] = MY_SORTS[status];
  return typeof value === "string" && options.includes(value)
    ? (value as MySort)
    : MY_SORTS[status][0];
}
