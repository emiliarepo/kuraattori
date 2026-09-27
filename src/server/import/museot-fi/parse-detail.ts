import { type HTMLElement, NodeType, parse } from "node-html-parser";

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

  const description = parseDescription(root);

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

  const admissionText = parseAdmissionText(root);

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
    description,
    startDate: range?.startDate,
    endDate: range?.endDate,
    imageUrl: imageSrc ? new URL(imageSrc, BASE_URL).href : undefined,
    websiteUrl,
    museumCardEligible,
    admissionText,
    categorySourceIds,
  };

  const result = detailSchema.safeParse(candidate);
  return result.success ? result.data : undefined;
}

/** The description paragraphs, the same on the Finnish, English and Swedish pages. */
export function parseDescription(root: HTMLElement): string | undefined {
  const text = root
    .querySelector(".p_1")
    ?.children.filter((child) => child.tagName === "P")
    .map((p) => p.text.trim())
    .filter(Boolean)
    .join("\n\n");
  return text === "" ? undefined : text;
}

function parseAdmissionText(root: HTMLElement): string | undefined {
  const lines: string[] = [];
  let node = root.querySelector("h2.paasymaksut")?.nextElementSibling;
  while (node?.tagName === "P") {
    if (!node.querySelector("a[href*='/osta']")) {
      const text = node.text.replace(/\s+/g, " ").trim();
      if (text) lines.push(text);
    }
    node = node.nextElementSibling;
  }
  return lines.length > 0 ? lines.join("\n") : undefined;
}
