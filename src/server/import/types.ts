export interface NormalizedCategory {
  sourceId: string;
  name: string;
}

export interface NormalizedMuseum {
  sourceId: string;
  name: string;
  city: string | undefined;
  region: string | undefined;
  museumCardEligible: boolean;
  websiteUrl: string | undefined;
}

export interface NormalizedExhibition {
  sourceId: string;
  museum: NormalizedMuseum;
  title: string;
  description: string | undefined;
  startDate: string;
  endDate: string | undefined;
  sourceUrl: string;
  imageUrl: string | undefined;
  museumCardEligible: boolean;
  admissionText: string | undefined;
  admissionAdultCents: number | undefined;
  categorySourceIds: string[];
  /** Hash of the listing payload, used to skip re-fetching an unchanged detail page. */
  payloadHash: string;
  /** Same-exhibition-at-several-venues key: see `~/server/import/grouping`. */
  exhibitionGroup: string;
  /** `notice` listings (closures, etc.) are kept but excluded from all lists. */
  kind: "exhibition" | "notice";
}

/**
 * An exhibition seen in the listing but not changed since the last run: the
 * detail page is skipped, and only `categorySourceIds` and `museum`
 * (identifying the already-known row) are used.
 */
export interface UnchangedExhibition {
  sourceId: string;
  categorySourceIds: string[];
}

export interface FetchExhibitionsResult {
  categories: NormalizedCategory[];
  changed: NormalizedExhibition[];
  unchanged: UnchangedExhibition[];
  /** Listing rows that failed validation; counted, not thrown. */
  failedCount: number;
}

/**
 * A single data source, per docs/spec.md §6-7. `fetchMuseums` is optional:
 * an adapter that only ever discovers museums through exhibition detail pages
 * (like museot.fi) can omit it.
 */
export interface ExhibitionSourceAdapter {
  readonly name: string;
  /**
   * `knownHashes` (source id → last-seen listing hash) lets the adapter skip
   * re-fetching detail pages for exhibitions that haven't changed.
   */
  fetchExhibitions: (
    knownHashes: ReadonlyMap<string, string>,
  ) => Promise<FetchExhibitionsResult>;
  fetchMuseums?: () => Promise<NormalizedMuseum[]>;
}
