import { installFrozenClock } from "~/server/frozen-clock";

export function register() {
  if (process.env.E2E_FROZEN_NOW)
    installFrozenClock(process.env.E2E_FROZEN_NOW);
}
