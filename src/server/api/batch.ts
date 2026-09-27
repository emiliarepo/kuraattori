const ID_BATCH_SIZE = 90;

/** Runs `fetch` over `ids` in batches, staying under D1's SQL variable limit for large `IN` lists. */
export async function batchedByIds<T>(
  ids: readonly number[],
  fetch: (batch: number[]) => Promise<T[]>,
): Promise<T[]> {
  const results: T[] = [];
  for (let offset = 0; offset < ids.length; offset += ID_BATCH_SIZE) {
    results.push(...(await fetch(ids.slice(offset, offset + ID_BATCH_SIZE))));
  }
  return results;
}
