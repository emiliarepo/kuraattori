import type { Locale } from "~/i18n/locales";

export interface LocalizedText {
  text: string;
  /** `"fi"` when the Finnish original stands in for a missing translation. */
  lang: "fi" | undefined;
}

type Text = string | null | undefined;

/**
 * Imported content comes as a Finnish column (`titleFi`, or plain `name`)
 * plus optional `…En` / `…Sv` translations.
 */
export type Translatable<F extends string> = Partial<
  Record<`${F}En` | `${F}Sv`, Text>
> &
  (Record<`${F}Fi`, Text> | Record<F, Text>);

const SUFFIX = { en: "En", sv: "Sv" } as const;

function nonBlank(value: Text): string | undefined {
  return value?.trim() ? value : undefined;
}

/** Each field falls back to Finnish on its own; Swedish never falls back to English. */
export function localized<F extends string>(
  row: Translatable<F>,
  field: F,
  locale: Locale,
): LocalizedText {
  const values = row as Record<string, Text>;
  const finnish = nonBlank(values[`${field}Fi`] ?? values[field]) ?? "";
  if (locale === "fi") return { text: finnish, lang: undefined };
  const translated = nonBlank(values[`${field}${SUFFIX[locale]}`]);
  if (translated !== undefined) return { text: translated, lang: undefined };
  return { text: finnish, lang: finnish ? "fi" : undefined };
}
