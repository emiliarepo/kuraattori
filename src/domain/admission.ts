const NUMBER = String.raw`\d+(?:,\d{1,2})?`;
const PRICE_LIST = new RegExp(
  String.raw`^(${NUMBER})\s*(€)?((?:\s*\/\s*${NUMBER}\s*€?)*)(?![\d.,-]*\d)`,
);
const PREFIX =
  /^(?:sisäänpääsy myös museokortilla\.\s*)?(?:pääsymaksut?|pääsylippu|pääsyliput|aikui(?:nen|set)|(?:[^.]*\.\s*)?norm(?:\.|aali))(?:\s+\d{4})?\s*:?\s*/i;
const FREE =
  /^(?:aina |kaikille |museoon on )?(?:vapaa pääsy|[il]{1,2}mainen sisäänpääsy)\b/i;

/**
 * Adult admission in cents from museot.fi's free-text "Pääsymaksut", or
 * undefined when the text isn't one clear price. The first figure of a
 * slash list ("23/13/0 €") is the adult price.
 */
export function parseAdultAdmissionCents(
  text: string | undefined,
): number | undefined {
  if (!text) return undefined;
  const normalized = text.replace(/​/g, "").trim();
  if (FREE.test(normalized)) return 0;

  const match = PRICE_LIST.exec(normalized.replace(PREFIX, ""));
  if (!match) return undefined;
  const [, first, euro, rest] = match;
  const others = [...(rest ?? "").matchAll(new RegExp(NUMBER, "g"))].map(
    ([n]) => toCents(n),
  );
  if (euro === undefined && others.length === 0 && !rest?.includes("€"))
    return undefined;
  const adult = toCents(first!);
  if (adult === 0 && others.some((cents) => cents > 0)) return undefined;
  return adult;
}

function toCents(value: string): number {
  return Math.round(Number(value.replace(",", ".")) * 100);
}
