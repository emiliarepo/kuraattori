let pending = false;

/** Set by the home banner's tap, so the page asks for the location only when the user asked for it, never on a plain page load. */
export function requestLocateOnArrival() {
  pending = true;
}

export function takeLocateIntent(): boolean {
  const value = pending;
  pending = false;
  return value;
}
