/**
 * Stub ahead of ticket 06, which reads the signed-in user's saved regions or
 * the anonymous region cookie. An empty array means "no region filter".
 */
export async function getActiveRegions(): Promise<string[]> {
  return [];
}
