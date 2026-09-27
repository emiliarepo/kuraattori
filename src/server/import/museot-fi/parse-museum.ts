import { NodeType, parse } from "node-html-parser";

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
