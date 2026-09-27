import type { OpeningHours } from "~/domain/opening-hours";

export interface NormalizedCategory {
  sourceId: string;
  name: string;
  nameEn?: string;
  nameSv?: string;
}

export interface NormalizedMuseum {
  sourceId: string;
  name: string;
  city: string | undefined;
  region: string | undefined;
  museumCardEligible: boolean;
  websiteUrl: string | undefined;
}

export interface MuseumLocation {
  address: string;
  latitude?: number;
  longitude?: number;
}

export interface MuseumPage {
  location: MuseumLocation | undefined;
  /** Undefined when the hours block is missing or unparseable. */
  openingHours: OpeningHours | undefined;
  freeDays: string[];
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

/** Text from an English or Swedish page; a field is undefined when absent. */
export interface TranslatedText {
  title?: string;
  description?: string;
  museumName?: string;
}

/**
 * English and Swedish text for one exhibition, produced only when its
 * translated listing rows changed since `hash` was last stored.
 */
export interface ExhibitionTranslation {
  sourceId: string;
  hash: string;
  en: TranslatedText;
  sv: TranslatedText;
}

export interface FetchExhibitionsResult {
  categories: NormalizedCategory[];
  changed: NormalizedExhibition[];
  unchanged: UnchangedExhibition[];
  translations: ExhibitionTranslation[];
  /** Listing rows that failed validation; counted, not thrown. */
  failedCount: number;
  /** Translated detail pages that failed to load; retried next run. */
  translationsFailed: number;
  /** Requests made for English and Swedish pages this run. */
  translationRequests: number;
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
   * re-fetching detail pages for exhibitions that haven't changed;
   * `knownTranslationHashes` does the same for the English and Swedish pages.
   */
  fetchExhibitions: (
    knownHashes: ReadonlyMap<string, string>,
    knownTranslationHashes: ReadonlyMap<string, string>,
  ) => Promise<FetchExhibitionsResult>;
  fetchMuseums?: () => Promise<NormalizedMuseum[]>;
  fetchMuseumPage?: (
    sourceId: string,
    city: string | null | undefined,
  ) => Promise<MuseumPage>;
}
