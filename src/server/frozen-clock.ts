/**
 * Pins the Worker's clock to `E2E_FROZEN_NOW` (an ISO instant), so the
 * visual-regression server renders the same "today" as the browser's
 * `page.clock`. Only the Playwright visual server sets that var.
 */
export function installFrozenClock(frozenIso: string): void {
  const RealDate = Date;
  const frozenNow = new RealDate(frozenIso).getTime();
  globalThis.Date = new Proxy(RealDate, {
    construct: (target, args: unknown[], newTarget) =>
      Reflect.construct(
        target,
        args.length === 0 ? [frozenNow] : args,
        newTarget,
      ) as object,
    get: (target, property, receiver) =>
      property === "now"
        ? () => frozenNow
        : (Reflect.get(target, property, receiver) as unknown),
  });
}
