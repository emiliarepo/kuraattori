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
const LINE_MAX = 15;

function isGeneric(word: string) {
  return GENERIC_WORDS.has(word.toLowerCase()) || word.startsWith("-");
}

function wrap(words: string[], max = LINE_MAX): string[] | null {
  const text = words.join(" ");
  if (!words.length) return null;
  if (text.length <= 10 || words.length === 1) return [text];
  let best: string[] | null = null;
  for (let split = 1; split < words.length; split++) {
    const lines = [
      words.slice(0, split).join(" "),
      words.slice(split).join(" "),
    ];
    const longest = Math.max(...lines.map((line) => line.length));
    if (
      longest <= max &&
      (!best || longest < Math.max(...best.map((line) => line.length)))
    )
      best = lines;
  }
  return best;
}

/**
 * One or two lines for the stamp face. Prefers the proper name after a
 * generic word ("Nykytaiteen museo Kiasma" → "Kiasma"), then an acronym,
 * then the name without generic words wrapped onto two lines. A generic
 * word after a genitive stays ("Kuurojen museo"), or the name reads cut off.
 */
export function stampLabel(name: string): string[] {
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
    /n$/.test(candidate.at(-1) ?? "");
  const kept = words.filter(
    (word, index) =>
      !isGeneric(word) || (index > 0 && endsInGenitive(words.slice(0, index))),
  );
  const withoutSuffixed = kept.filter((word) => !GENERIC_SUFFIX.test(word));
  const candidates = [
    lastGeneric >= 0 && /^\p{Lu}/u.test(tail[0] ?? "") ? tail : [],
    kept.filter((word) => /^\p{Lu}{2,}$/u.test(word)).slice(0, 1),
    kept,
    endsInGenitive(withoutSuffixed) ? [] : withoutSuffixed,
  ];
  for (const candidate of candidates) {
    const lines = wrap(candidate);
    if (lines) return lines;
  }
  return wrap(kept, Infinity) ?? [words[0]!];
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
  const { cities, others } = groupRegions([...byRegion.keys()]);
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
