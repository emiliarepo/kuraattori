import { daysBetween } from "./dates";

export const CLOSING_PUSH_DAYS = 7;

export interface InterestedEnding {
  readonly userId: string;
  readonly exhibitionId: number;
  readonly title: string;
  readonly museum: string;
  readonly slug: string;
  readonly endDate: string;
}

export interface SentLogEntry {
  readonly userId: string;
  readonly exhibitionId: number;
  readonly sentOn: string;
}

export interface ClosingPush {
  readonly userId: string;
  readonly exhibitionIds: number[];
  readonly title: string;
  readonly body: string;
  readonly url: string;
}

function endingIn(days: number): string {
  if (days === CLOSING_PUSH_DAYS) return "Päättyy viikon päästä";
  if (days === 1) return "Päättyy huomenna";
  return `Päättyy ${days} päivän päästä`;
}

/**
 * One notification per user with interested exhibitions ending within a week
 * that have not been notified yet, and none at all for a user already
 * notified today. Several due exhibitions are bundled.
 */
export function selectClosingPushes(
  interested: readonly InterestedEnding[],
  sent: readonly SentLogEntry[],
  today: string,
): ClosingPush[] {
  const notified = new Set(sent.map((s) => `${s.userId}:${s.exhibitionId}`));
  const notifiedToday = new Set(
    sent.filter((s) => s.sentOn === today).map((s) => s.userId),
  );

  const dueByUser = new Map<string, InterestedEnding[]>();
  for (const item of interested) {
    const days = daysBetween(today, item.endDate);
    if (days < 1 || days > CLOSING_PUSH_DAYS) continue;
    if (notifiedToday.has(item.userId)) continue;
    if (notified.has(`${item.userId}:${item.exhibitionId}`)) continue;
    const due = dueByUser.get(item.userId) ?? [];
    due.push(item);
    dueByUser.set(item.userId, due);
  }

  return [...dueByUser].map(([userId, due]) => {
    due.sort((a, b) => a.endDate.localeCompare(b.endDate));
    const exhibitionIds = due.map((item) => item.exhibitionId);
    const [first] = due as [InterestedEnding];
    if (due.length === 1)
      return {
        userId,
        exhibitionIds,
        title: `${endingIn(daysBetween(today, first.endDate))}: ${first.title}, ${first.museum}`,
        body: "Kiinnostava näyttely päättyy pian.",
        url: `/exhibitions/${first.slug}`,
      };
    return {
      userId,
      exhibitionIds,
      title: `${due.length} kiinnostavaa näyttelyä päättyy viikon sisällä`,
      body: due.map((item) => item.title).join(" · "),
      url: "/my/interested",
    };
  });
}
