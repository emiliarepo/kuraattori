import { type HTMLElement, NodeType, parse } from "node-html-parser";

import type {
  DayHours,
  OpeningHours,
  WeeklyHours,
} from "~/domain/opening-hours";

import type { MuseumLocation } from "../types";

export function parseMuseumPage(
  html: string,
  city?: string | null,
): MuseumLocation | undefined {
  const root = parse(html);
  const contact = root
    .querySelectorAll(".museon_tiedot > p")
    .find((paragraph) => paragraph.querySelector("br"));
  if (!contact) return undefined;

  const parts: string[] = [];
  let afterName = false;
  for (const node of contact.childNodes) {
    if (node.nodeType === NodeType.ELEMENT_NODE && node.rawTagName === "br") {
      if (afterName) break;
      afterName = true;
    } else if (afterName) {
      parts.push(node.text);
    }
  }
  const streetAddress = parts.join(" ").replace(/\s+/g, " ").trim();
  const encodedRoute = root.querySelector("#mh_osoite2")?.getAttribute("value");
  const route = encodedRoute ? decodeURIComponent(encodedRoute) : "";
  const routeAddress = route.split("::")[0]?.trim();
  if (!streetAddress || (!/\d/.test(streetAddress) && !routeAddress))
    return undefined;
  const trailingPlace = streetAddress.split(",").at(-1)?.trim();
  const hasCity =
    city &&
    trailingPlace &&
    city
      .toLocaleLowerCase("fi-FI")
      .startsWith(trailingPlace.toLocaleLowerCase("fi-FI"));
  const address =
    city && !/\b\d{5}\s+\S/.test(streetAddress) && !hasCity
      ? `${streetAddress}, ${city}`
      : streetAddress;

  const coordinates = /::(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/.exec(route);
  const latitude = coordinates ? Number(coordinates[1]) : undefined;
  const longitude = coordinates ? Number(coordinates[2]) : undefined;

  return { address, latitude, longitude };
}

const WEEKDAY_LABELS = ["ma", "ti", "ke", "to", "pe", "la", "su"];
const HOURS = /^(\d{1,2})[:.](\d{2})\s*[–-]\s*(\d{1,2})[:.](\d{2})$/;

function time(hours: string, minutes: string): string | undefined {
  const h = Number(hours);
  const m = Number(minutes);
  if (h > 24 || m > 59) return undefined;
  return `${String(h).padStart(2, "0")}:${minutes}`;
}

function cellText(cell: HTMLElement | undefined): string {
  return (cell?.text ?? "")
    .replace(/\u00ad/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const FREE_DAY_TITLE = /ilmaispäiv|maksuton/i;
const SINGLE_DATE = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/;

/** Single-date events titled as free entry, from the museum's event list. */
export function parseFreeDays(html: string): string[] {
  const heading = parse(html)
    .querySelectorAll("h2")
    .find((h2) => h2.text.trim() === "Museon tapahtumat");
  const list = heading?.nextElementSibling;
  if (!list) return [];
  const days = new Set<string>();
  for (const item of list.querySelectorAll("li .txt")) {
    const date = item.querySelector(".paiva")?.text.trim() ?? "";
    const title = item.text.slice(0, item.text.length - date.length);
    const match = SINGLE_DATE.exec(date);
    if (!match || !FREE_DAY_TITLE.test(title)) continue;
    const [, day, month, year] = match;
    days.add(`${year}-${month!.padStart(2, "0")}-${day!.padStart(2, "0")}`);
  }
  return [...days].sort();
}

function parseDays(table: HTMLElement): WeeklyHours | undefined {
  const rows = table.querySelectorAll("tr");
  if (rows.length !== 7) return undefined;
  const days: (DayHours | null)[] = [];
  for (const [index, row] of rows.entries()) {
    const [label, value = ""] = row.querySelectorAll("td").map(cellText);
    if (label?.toLocaleLowerCase("fi-FI") !== WEEKDAY_LABELS[index])
      return undefined;
    if (/^suljettu$/i.test(value)) {
      days.push(null);
      continue;
    }
    const match = HOURS.exec(value);
    if (!match) return undefined;
    const open = time(match[1]!, match[2]!);
    const close = time(match[3]!, match[4]!);
    if (!open || !close || open >= close) return undefined;
    days.push({ open, close });
  }
  return days as unknown as WeeklyHours;
}

const CLOSED_WEEK: WeeklyHours = [null, null, null, null, null, null, null];

/**
 * The regular weekly hours: seven Ma–Su rows of `HH:MM-HH:MM` or `Suljettu`,
 * or "Suljettu väliaikaisesti" in place of the table. Anything else is
 * unparseable and returns undefined.
 */
export function parseOpeningHours(html: string): OpeningHours | undefined {
  const heading = parse(html).querySelector("h2.aukioloajat");
  if (!heading) return undefined;
  let days: WeeklyHours | undefined;
  const notes: string[] = [];
  for (
    let node = heading.nextElementSibling;
    node && (node.tagName === "TABLE" || node.tagName === "P");
    node = node.nextElementSibling
  ) {
    const text = cellText(node);
    if (node.tagName === "TABLE") days ??= parseDays(node);
    else if (
      !days &&
      notes.length === 0 &&
      /^suljettu väliaikaisesti$/i.test(text)
    )
      days = CLOSED_WEEK;
    else if (text) notes.push(text);
  }
  if (!days) return undefined;
  const note = notes.join(" ");
  return note ? { days, note } : { days };
}
