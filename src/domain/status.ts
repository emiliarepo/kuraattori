export type UserExhibitionStatus = "interested" | "visited" | "hidden";

export interface StatusTransition {
  readonly status: UserExhibitionStatus | null;
  readonly visitedAt: "set" | "clear";
}

/** Setting a status replaces the previous one; pressing the active one clears it. */
export function transitionStatus(
  current: UserExhibitionStatus | null,
  requested: UserExhibitionStatus,
): StatusTransition {
  const status = current === requested ? null : requested;
  return { status, visitedAt: status === "visited" ? "set" : "clear" };
}
