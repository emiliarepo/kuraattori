import { parse } from "node-html-parser";

import { hashListingPayload } from "../hash";
import type { ExhibitionTranslation, TranslatedText } from "../types";
import { parseDescription } from "./parse-detail";
import { listingItemFields, listingRows, parseTopics } from "./parse-listing";

export type TranslationLocale = "en" | "sv";
export const TRANSLATION_LOCALES: readonly TranslationLocale[] = ["en", "sv"];

const SECTION: Record<TranslationLocale, string> = {
  en: "/exhibitions/index.php",
  sv: "/utstallningar/index.php",
};

export const translatedListingPath = (locale: TranslationLocale) =>
  `${SECTION[locale]}?kaikki=1`;

export const translatedDetailPath = (
  locale: TranslationLocale,
  sourceId: string,
) => `${SECTION[locale]}?nayttely_id=${sourceId}`;

/** A row of the English or Swedish listing. Untranslated fields repeat the Finnish text, and a museum without a translated name is blank. */
export interface TranslatedListingItem {
  title: string;
  excerpt: string;
  museumName: string;
}

export interface TranslatedListing {
  items: Map<string, TranslatedListingItem>;
  topics: Map<string, string>;
}

export function parseTranslatedListing(html: string): TranslatedListing {
  const root = parse(html);
  const items = new Map<string, TranslatedListingItem>();
  for (const li of listingRows(root)) {
    const fields = listingItemFields(li);
    if (!fields.sourceId || !fields.title) continue;
    items.set(fields.sourceId, {
      title: fields.title,
      excerpt: fields.excerpt ?? "",
      museumName: fields.museumName ?? "",
    });
  }
  return {
    items,
    topics: new Map(parseTopics(root).map((t) => [t.sourceId, t.name])),
  };
}

/** Trimmed, or undefined when empty or the same as the Finnish text museot.fi falls back to. */
export function distinctTranslation(
  value: string | null | undefined,
  finnish: string | null | undefined,
): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed || trimmed === finnish?.trim()) return undefined;
  return trimmed;
}

/** Whether a detail page could hold translated text: its listing row has a translated title or excerpt. */
export function hasTranslatedText(
  finnish: { title: string; excerpt: string },
  translated: TranslatedListingItem | undefined,
): boolean {
  if (!translated) return false;
  return (
    distinctTranslation(translated.title, finnish.title) !== undefined ||
    distinctTranslation(translated.excerpt, finnish.excerpt) !== undefined
  );
}

/** Changes whenever either translated listing row does, so unchanged translations are never refetched. */
export function hashTranslations(
  rows: Partial<Record<TranslationLocale, TranslatedListingItem>>,
): string {
  return hashListingPayload({
    enTitle: rows.en?.title,
    enExcerpt: rows.en?.excerpt,
    enMuseum: rows.en?.museumName,
    svTitle: rows.sv?.title,
    svExcerpt: rows.sv?.excerpt,
    svMuseum: rows.sv?.museumName,
  });
}

/** Title and description of an English or Swedish detail page, as shown (possibly still Finnish). */
export function parseTranslatedDetail(html: string): TranslatedText {
  const root = parse(html);
  const title = root.querySelector("h1")?.text.trim();
  return {
    title: title === "" ? undefined : title,
    description: parseDescription(root),
  };
}

export interface TranslationRun {
  translations: ExhibitionTranslation[];
  failed: number;
  requests: number;
}

/**
 * English and Swedish text for every exhibition whose translated listing
 * rows changed. A detail page is fetched only when its row shows translated
 * text; a failed fetch leaves the stored hash alone, so the next run retries.
 */
export async function collectTranslations(
  items: readonly {
    sourceId: string;
    title: string;
    excerpt: string;
    museumName: string;
  }[],
  listings: Record<TranslationLocale, TranslatedListing>,
  knownHashes: ReadonlyMap<string, string>,
  fetchDetail: (
    locale: TranslationLocale,
    sourceId: string,
  ) => Promise<string | undefined>,
): Promise<TranslationRun> {
  const run: TranslationRun = { translations: [], failed: 0, requests: 0 };
  for (const item of items) {
    const rows = {
      en: listings.en.items.get(item.sourceId),
      sv: listings.sv.items.get(item.sourceId),
    };
    const hash = hashTranslations(rows);
    if (knownHashes.get(item.sourceId) === hash) continue;

    try {
      const text = {} as Record<TranslationLocale, TranslatedText>;
      for (const locale of TRANSLATION_LOCALES) {
        const row = rows[locale];
        text[locale] = {
          museumName: distinctTranslation(row?.museumName, item.museumName),
        };
        if (!row || !hasTranslatedText(item, row)) continue;
        // A translated page keeps its title even when it reads the same in Finnish.
        text[locale].title = row.title.trim();
        run.requests++;
        const html = await fetchDetail(locale, item.sourceId);
        if (html)
          text[locale].description = parseTranslatedDetail(html).description;
      }
      run.translations.push({ sourceId: item.sourceId, hash, ...text });
    } catch {
      run.failed++;
    }
  }
  return run;
}
