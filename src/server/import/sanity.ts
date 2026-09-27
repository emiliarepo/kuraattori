export function importSanityError(
  previousFetched: number | undefined,
  fetched: number,
  failed: number,
): string | undefined {
  const errors: string[] = [];

  if (previousFetched !== undefined && fetched * 2 < previousFetched) {
    errors.push(
      `Fetched ${fetched} items, below 50% of the previous successful run (${previousFetched})`,
    );
  }
  if (failed > 0 && failed * 20 > fetched + failed) {
    errors.push(`Failed ${failed} of ${fetched + failed} items, above 5%`);
  }

  return errors.length ? errors.join("; ") : undefined;
}
