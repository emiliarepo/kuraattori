import { NodeType, parse } from "node-html-parser";

import { parseDateRange } from "./dates";
import { detailSchema } from "./schemas";

const BASE_URL = "https://museot.fi/";

export type RawDetail = ReturnType<typeof detailSchema.parse>;

export function parseDetailPage(html: string): RawDetail | undefined {
  const root = parse(html);

  const title = root.querySelector("h1")?.text.trim();
  const paikka = root.querySelector("p.paikka");
  const museumLink = paikka?.querySelector("a");
  const museumHref = museumLink?.getAttribute("href");
  const museumSourceId = museumHref
    ? /museo_id=(\d+)/.exec(museumHref)?.[1]
    : undefined;
  const museumName = museumLink?.text.trim();

  const ajankohta = root.querySelector("li.ajankohta")?.text;
  const range = ajankohta ? parseDateRange(ajankohta) : undefined;

  let city: string | undefined;
  if (paikka) {
    let cityText = "";
    for (const node of paikka.childNodes) {
      if (node.nodeType === NodeType.TEXT_NODE) cityText += node.text;
    }
    city = cityText.replace(/^[,\s]+/, "").trim() || undefined;
  }

  const description = root
    .querySelector(".p_1")
    ?.children.filter((child) => child.tagName === "P")
    .map((p) => p.text.trim())
    .filter(Boolean)
    .join("\n\n");

  const imageSrc = root
    .querySelector(".paakuva img")
    ?.getAttribute("data-x-src");

  const websiteUrl = root
    .querySelector(".museon_tiedot")
    ?.querySelectorAll("a")
    .find((a) => a.text.trim() === "Museon kotisivut")
    ?.getAttribute("href");

  const museumCardEligible =
    root.querySelector(
      ".sisaanpaasy_museokortilla img[alt='Sisäänpääsy Museokortilla']",
    ) !== null;

  const categorySourceIds =
    root
      .querySelector("h2.kategoriat")
      ?.parentNode?.querySelectorAll("ul li a")
      .map((a) => /topic_(\d+)=1/.exec(a.getAttribute("href") ?? "")?.[1])
      .filter((id): id is string => id !== undefined) ?? [];

  const candidate = {
    title,
    museumSourceId,
    museumName,
    city,
    description: description === "" ? undefined : description,
    startDate: range?.startDate,
    endDate: range?.endDate,
    imageUrl: imageSrc ? new URL(imageSrc, BASE_URL).href : undefined,
    websiteUrl,
    museumCardEligible,
    categorySourceIds,
  };

  const result = detailSchema.safeParse(candidate);
  return result.success ? result.data : undefined;
}
