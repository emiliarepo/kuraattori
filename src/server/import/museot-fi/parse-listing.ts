import { type HTMLElement, NodeType, parse } from "node-html-parser";

import { parseDateRange } from "./dates";
import { listingItemSchema } from "./schemas";

const BASE_URL = "https://museot.fi/nayttelykalenteri/";

export type RawListingItem = ReturnType<typeof listingItemSchema.parse>;

export interface Taxonomy {
  topics: { sourceId: string; name: string }[];
  maakuntas: { id: string; name: string }[];
}

/** Text of `parent`'s child nodes strictly between `from` and `until` (both excluded). */
function textBetween(
  parent: HTMLElement,
  from: HTMLElement,
  until: HTMLElement,
): string {
  const children = parent.childNodes;
  const fromIndex = children.indexOf(from);
  const untilIndex = children.indexOf(until);
  let text = "";
  for (let i = fromIndex + 1; i < untilIndex; i++) {
    const node = children[i];
    if (node?.nodeType === NodeType.TEXT_NODE) text += node.text;
  }
  return text.trim();
}

function directTextContent(element: HTMLElement): string {
  let text = "";
  for (const node of element.childNodes) {
    if (node.nodeType === NodeType.TEXT_NODE) text += node.text;
  }
  return text.replace(/,\s*$/, "").trim();
}

/** One `<li>` from a listing page. Returns `undefined` for a row too malformed to use. */
export function parseListingItem(li: HTMLElement): RawListingItem | undefined {
  const link = li.querySelector("a.normaali");
  const href = link?.getAttribute("href");
  const sourceId = href ? /nayttely_id=(\d+)/.exec(href)?.[1] : undefined;
  const tekstit = li.querySelector(".tekstit");
  const h2 = tekstit?.querySelector("h2");
  const paikka = li.querySelector("p.paikka");
  const city = paikka?.querySelector("span.kunta")?.text.trim();
  const ajankohta = li.querySelector("p.ajankohta")?.text;
  const range = ajankohta ? parseDateRange(ajankohta) : undefined;
  const imageSrc = li.querySelector(".kuva")?.getAttribute("data-x-bg-src");

  const candidate = {
    sourceId,
    title: h2?.text.trim(),
    excerpt:
      tekstit && h2 && paikka ? textBetween(tekstit, h2, paikka) : undefined,
    museumName: paikka ? directTextContent(paikka) : undefined,
    city,
    imageUrl: imageSrc ? new URL(imageSrc, BASE_URL).href : undefined,
    startDate: range?.startDate,
    endDate: range?.endDate,
  };

  const result = listingItemSchema.safeParse(candidate);
  return result.success ? result.data : undefined;
}

export interface ParsedListingPage {
  items: RawListingItem[];
  failedCount: number;
  taxonomy: Taxonomy;
}

export function parseListingPage(html: string): ParsedListingPage {
  const root = parse(html);
  const items: RawListingItem[] = [];
  let failedCount = 0;
  for (const li of root.querySelectorAll("li[id^='li']")) {
    const item = parseListingItem(li);
    if (item) items.push(item);
    else failedCount++;
  }

  const topics = root
    .querySelectorAll(".rastit_area input[id^='topic_']")
    .map((input) => {
      const sourceId = input.getAttribute("id")?.replace("topic_", "");
      const name = input.parentNode?.text.trim();
      return sourceId && name ? { sourceId, name } : undefined;
    })
    .filter((topic) => topic !== undefined);

  const maakuntas = root
    .querySelectorAll("#maakunta_id option[value]")
    .map((option) => {
      const id = option.getAttribute("value");
      const name = option.text.trim();
      return id && name ? { id, name } : undefined;
    })
    .filter((maakunta) => maakunta !== undefined);

  return { items, failedCount, taxonomy: { topics, maakuntas } };
}
