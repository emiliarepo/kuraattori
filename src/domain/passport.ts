import { groupRegions } from "~/domain/regions";

/** Must match the `--stamp-*` values in src/styles/tokens.css; the share PNG can't read CSS variables. */
export const STAMP_INKS = {
  rust: "#8f3a14",
  green: "#2f5a45",
  blue: "#2b4668",
  ochre: "#7a5a12",
  plum: "#653553",
} as const;
export const STAMP_PAPER = "#fbf7ee";
export const STAMP_POSTMARK = "#1f1a14";

export type StampInk = keyof typeof STAMP_INKS;
const INK_ORDER = Object.keys(STAMP_INKS) as StampInk[];

function hash(seed: number, salt: number): number {
  let value = (0x811c9dc5 ^ salt) >>> 0;
  for (const byte of [seed & 255, (seed >>> 8) & 255, (seed >>> 16) & 255]) {
    value = Math.imul(value ^ byte, 0x01000193) >>> 0;
  }
  return value;
}

function spread(seed: number, salt: number, max: number): number {
  return ((hash(seed, salt) % 2001) / 1000 - 1) * max;
}

export interface StampLook {
  ink: StampInk;
  rotation: number;
  postmarkRotation: number;
}

export function stampLook(museumId: number): StampLook {
  return {
    ink: INK_ORDER[hash(museumId, 1) % INK_ORDER.length]!,
    rotation: Math.round(spread(museumId, 2, 2) * 10) / 10,
    postmarkRotation: Math.round(spread(museumId, 3, 18)),
  };
}

const GENERIC_WORDS = new Set([
  "museo",
  "museum",
  "museet",
  "museot",
  "galleria",
  "keskus",
]);
const GENERIC_SUFFIX = /(museo|museum|keskus|galleria)$/i;
const CONJUNCTIONS = new Set(["ja", "och", "&"]);

/** Labels the rules below get wrong, by museum name as museot.fi spells it. */
export const LABEL_OVERRIDES: Record<string, string> = {
  "Ahvenanmaan kulttuurihistoriallinen museo": "Ahvenanmaan museo",
  "Apteekkimuseo ja Qwenselin talo": "Qwenselin talo",
  "Kurikan museo ja Kotiseututalo": "Kurikan museo",
  "Rakennuskulttuuritalo Toivo ja Korsmanin talo":
    "Rakennuskulttuuritalo Toivo",
  "Sallan sota- ja jälleenrakennusajan museo": "Sallan museo",
  "Sodan ja Rauhan keskus Muisti & Päämajamuseo": "Muisti",
  "Taivalkosken sota-ajan perinnehuone": "Taivalkosken perinnehuone",
  "Turun yliopiston kasvitieteellinen puutarha":
    "Turun kasvitieteellinen puutarha",
  "UPM Verlan tehdasmuseo": "Verla",
  "Teresia ja Rafael Lönnströmin kotimuseo": "Lönnströmin kotimuseo",
  "Kuntsin modernin taiteen museo": "Kuntsi",
  "Suomen valokuvataiteen museo": "Valokuvataiteen museo",
  "Söderlångviks museum (Söderlångvikin museo)": "Söderlångvik",
  "Karkkilan ruukkimuseo Senkka: Suomen Valimomuseo": "Senkka",
  "Degerby Igor -museo": "Degerby Igor",
};

const GLYPHS =
  " &'(),-.0123456789:ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzÄÅÖäåéö–";
/** Advance widths (1/1000 em) of public/fonts/newsreader-italic-500.ttf. */
const ADVANCES = [
  228, 698, 197, 282, 282, 238, 347, 232, 588, 588, 588, 588, 588, 588, 588,
  654, 588, 588, 262, 698, 644, 688, 750, 636, 586, 742, 786, 346, 438, 715,
  586, 960, 745, 760, 608, 758, 654, 553, 648, 744, 678, 948, 696, 670, 622,
  518, 488, 396, 520, 416, 326, 442, 521, 301, 274, 504, 278, 798, 563, 470,
  532, 488, 422, 363, 337, 540, 491, 700, 503, 492, 434, 698, 698, 760, 518,
  518, 416, 470, 494,
];

function textWidth(text: string): number {
  let width = 0;
  for (const char of text) width += ADVANCES[GLYPHS.indexOf(char)] ?? 600;
  return width / 1000;
}

/** Font sizes in stamp units (the stamp is 100 wide): one line, or two to three. */
export const LABEL_SIZES = { large: 13, small: 10.5 } as const;
const LABEL_WIDTH = 76;
const MAX_LINES = 3;
const COMPOUND_TAILS = [
  "taidemuseo",
  "museo",
  "keskus",
  "talo",
  "halli",
  "koti",
  "kartano",
  "puutarha",
  "museum",
];

const fits = (line: string, size: number) =>
  textWidth(line) * size <= LABEL_WIDTH;

export function labelSize(lines: readonly string[]): number {
  return lines.length === 1 && fits(lines[0]!, LABEL_SIZES.large)
    ? LABEL_SIZES.large
    : LABEL_SIZES.small;
}

interface Token {
  text: string;
  /** Joins the previous token without a space, dropping its added hyphen. */
  glued: boolean;
  hyphenAdded: boolean;
}

function breakWord(word: string): Token[] | null {
  const dash = word.indexOf("-", 1);
  const suffix = COMPOUND_TAILS.find(
    (tail) =>
      word.toLowerCase().endsWith(tail) && word.length > tail.length + 2,
  );
  const tail =
    dash > 0 && dash < word.length - 1
      ? word.slice(dash + 1)
      : suffix && word.slice(-suffix.length);
  if (!tail) return null;
  const head = word.slice(0, -tail.length);
  const hyphenAdded = !head.endsWith("-");
  const parts = [
    { text: hyphenAdded ? `${head}-` : head, glued: false, hyphenAdded },
    { text: tail, glued: true, hyphenAdded: false },
  ];
  return parts.every((part) => fits(part.text, LABEL_SIZES.small))
    ? parts
    : null;
}

/** Breaks a word too wide for a line at its hyphen or before its last compound part. */
function tokens(words: string[]): Token[] | null {
  const result: Token[] = [];
  for (const word of words) {
    const parts = fits(word, LABEL_SIZES.small)
      ? [{ text: word, glued: false, hyphenAdded: false }]
      : breakWord(word);
    if (!parts) return null;
    result.push(...parts);
  }
  return result;
}

function joinLine(line: Token[]): string {
  return line.reduce((text, token, index) => {
    if (index === 0) return token.text;
    if (!token.glued) return `${text} ${token.text}`;
    return (
      (line[index - 1]!.hyphenAdded ? text.slice(0, -1) : text) + token.text
    );
  }, "");
}

function partitions(items: Token[], parts: number): Token[][][] {
  if (parts === 1) return [[items]];
  const result: Token[][][] = [];
  for (let split = 1; split <= items.length - parts + 1; split++)
    for (const rest of partitions(items.slice(split), parts - 1))
      result.push([items.slice(0, split), ...rest]);
  return result;
}

/**
 * One line at the large size, else the fewest (at least two, when there are
 * several words) and most even lines at the small size; null if nothing fits.
 */
function layout(words: string[]): string[] | null {
  if (!words.length) return null;
  const whole = words.join(" ");
  if (fits(whole, LABEL_SIZES.large)) return [whole];
  const items = tokens(words);
  if (!items) return null;
  const fewest = items.length > 1 ? 2 : 1;
  for (
    let count = fewest;
    count <= Math.min(MAX_LINES, items.length);
    count++
  ) {
    let best: string[] | null = null;
    let bestWidth = Infinity;
    for (const partition of partitions(items, count)) {
      const lines = partition.map(joinLine);
      const widest = Math.max(...lines.map(textWidth));
      if (widest * LABEL_SIZES.small <= LABEL_WIDTH && widest < bestWidth) {
        best = lines;
        bestWidth = widest;
      }
    }
    if (best) return best;
  }
  return null;
}

function isGeneric(word: string) {
  return GENERIC_WORDS.has(word.toLowerCase()) || word.startsWith("-");
}

const isAcronym = (word: string) => /^\p{Lu}{2,}$/u.test(word);

function readable(words: string[]): boolean {
  const first = words[0] ?? "";
  const last = words.at(-1) ?? "";
  return (
    words.length > 0 &&
    !CONJUNCTIONS.has(first.toLowerCase()) &&
    !CONJUNCTIONS.has(last.toLowerCase()) &&
    (words.join("").length >= 3 || isAcronym(first))
  );
}

/**
 * One to three lines for the stamp face. Prefers the proper name after a
 * generic word ("Nykytaiteen museo Kiasma" → "Kiasma"), then an acronym,
 * then the name without generic words. A generic word after a genitive
 * stays ("Kuurojen museo"), or the name reads cut off.
 */
export function stampLabel(name: string): string[] {
  const override = LABEL_OVERRIDES[name];
  if (override) return layout(override.split(/\s+/)) ?? [override];
  const head = name.split(/,|:|\s\(|\s[–-]\s/)[0]!.trim();
  const words = head
    .split(/\s+/)
    .map((word) => word.replace(/(?<=\p{L})-museo(t)?$/u, ""));
  const lastGeneric = words.reduce(
    (last, word, index) =>
      isGeneric(word) || GENERIC_SUFFIX.test(word) ? index : last,
    -1,
  );
  const tail = words.slice(lastGeneric + 1);
  const endsInGenitive = (candidate: string[]) =>
    (candidate.at(-1) ?? "").endsWith("n");
  const kept = words.filter(
    (word, index) =>
      !isGeneric(word) || (index > 0 && endsInGenitive(words.slice(0, index))),
  );
  const withoutSuffixed = kept.filter((word) => !GENERIC_SUFFIX.test(word));
  const candidates = [
    lastGeneric >= 0 && /^\p{Lu}/u.test(tail[0] ?? "") ? tail : [],
    kept.filter(isAcronym).slice(0, 1),
    kept,
    endsInGenitive(withoutSuffixed) ? [] : withoutSuffixed,
    words,
  ];
  for (const candidate of candidates) {
    if (!readable(candidate)) continue;
    const lines = layout(candidate);
    if (lines) return lines;
  }
  return [head];
}

const ROMAN_MONTHS = [
  "I",
  "II",
  "III",
  "IV",
  "V",
  "VI",
  "VII",
  "VIII",
  "IX",
  "X",
  "XI",
  "XII",
];

function helsinkiParts(date: Date) {
  const [year, month, day] = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Helsinki",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(date)
    .split("-")
    .map(Number);
  return { year: year!, month: month!, day: day! };
}

/** Postmark style, e.g. "27.IX.2026". */
export function postmarkDate(date: Date): string {
  const { year, month, day } = helsinkiParts(date);
  return `${day}.${ROMAN_MONTHS[month - 1]}.${year}`;
}

export function visitDate(date: Date): string {
  const { year, month, day } = helsinkiParts(date);
  return `${day}.${month}.${year}`;
}

export function visitYear(date: Date): number {
  return helsinkiParts(date).year;
}

export interface PassportMuseum {
  id: number;
  name: string;
  slug: string;
  city: string | null;
  region: string | null;
}

export interface StampedMuseum extends PassportMuseum {
  firstVisitedAt: Date;
}

export interface PassportRegion {
  region: string;
  total: number;
  stamped: StampedMuseum[];
  unstamped: PassportMuseum[];
}

export interface Passport {
  total: number;
  stampedCount: number;
  regions: PassportRegion[];
}

const collator = new Intl.Collator("fi-FI");

export function buildPassport(
  museums: readonly PassportMuseum[],
  firstVisits: ReadonlyMap<number, Date>,
  otherRegion: string,
  displayName: (region: string) => string = (region) => region,
  intlLocale = "fi-FI",
): Passport {
  const byRegion = new Map<string, PassportRegion>();
  for (const museum of museums) {
    const region = museum.region ?? otherRegion;
    const entry = byRegion.get(region) ?? {
      region,
      total: 0,
      stamped: [],
      unstamped: [],
    };
    byRegion.set(region, entry);
    entry.total++;
    const firstVisitedAt = firstVisits.get(museum.id);
    if (firstVisitedAt) entry.stamped.push({ ...museum, firstVisitedAt });
    else entry.unstamped.push(museum);
  }
  const { cities, others } = groupRegions(
    [...byRegion.keys()],
    displayName,
    intlLocale,
  );
  const regions = [...cities, ...others].map((region) => {
    const entry = byRegion.get(region)!;
    entry.stamped.sort(
      (a, b) =>
        a.firstVisitedAt.getTime() - b.firstVisitedAt.getTime() ||
        collator.compare(a.name, b.name),
    );
    entry.unstamped.sort((a, b) => collator.compare(a.name, b.name));
    return entry;
  });
  return {
    total: museums.length,
    stampedCount: regions.reduce((sum, r) => sum + r.stamped.length, 0),
    regions,
  };
}

const BAR_CELLS = 5;
const SHARE_REGIONS = 3;

/** Five cells, at least one filled once a region has any stamp. */
export function progressBar(stamped: number, total: number): string {
  const filled =
    stamped > 0
      ? Math.max(1, Math.round((stamped / Math.max(total, 1)) * BAR_CELLS))
      : 0;
  return "▰".repeat(filled) + "▱".repeat(BAR_CELLS - filled);
}

export interface ShareCopy {
  headline: (year: number, stamped: number, total: number) => string;
  moreRegions: (count: number) => string;
}

/**
 * Feed text for "Jaa passi": the headline, then the regions with the most
 * stamps on one line. The URL is shared separately.
 */
export function passportShareText(
  passport: Passport,
  year: number,
  copy: ShareCopy,
  regionName: (region: string) => string = (region) => region,
): string {
  const regions = passport.regions
    .filter((region) => region.stamped.length)
    .map((region, order) => ({ region, order }))
    .sort(
      (a, b) =>
        b.region.stamped.length - a.region.stamped.length || a.order - b.order,
    )
    .map(({ region }) => region);
  const parts = regions
    .slice(0, SHARE_REGIONS)
    .map(
      (region) =>
        `${regionName(region.region)} ${progressBar(region.stamped.length, region.total)}`,
    );
  if (regions.length > SHARE_REGIONS)
    parts.push(copy.moreRegions(regions.length - SHARE_REGIONS));
  return [
    copy.headline(year, passport.stampedCount, passport.total),
    ...(parts.length ? [parts.join(" · ")] : []),
  ].join("\n");
}
