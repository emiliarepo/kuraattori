const monthFormat = new Intl.DateTimeFormat("fi-FI", { month: "short" });
const dateFormat = new Intl.DateTimeFormat("fi-FI", {
  timeZone: "Europe/Helsinki",
  day: "numeric",
  month: "numeric",
  year: "numeric",
});

export function monthLabel(month: number): string {
  return monthFormat.format(new Date(Date.UTC(2024, month - 1, 1)));
}

export function formatVisitDate(visitedAt: Date): string {
  return dateFormat.format(visitedAt);
}
