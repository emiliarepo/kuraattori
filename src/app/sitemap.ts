import { type MetadataRoute } from "next";

import { siteUrl } from "~/app/_lib/site-url";
import { api } from "~/trpc/server";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [museums, firstPage] = await Promise.all([
    api.museum.list(),
    api.exhibition.list({ limit: 50 }),
  ]);
  const exhibitions = [...firstPage.items];
  let cursor = firstPage.nextCursor;

  while (cursor) {
    const page = await api.exhibition.list({ limit: 50, cursor });
    exhibitions.push(...page.items);
    cursor = page.nextCursor;
  }

  return [
    { url: new URL("/", siteUrl).toString() },
    { url: new URL("/exhibitions", siteUrl).toString() },
    { url: new URL("/museums", siteUrl).toString() },
    ...exhibitions.map(({ slug, updatedAt }) => ({
      url: new URL(`/exhibitions/${slug}`, siteUrl).toString(),
      lastModified: updatedAt ?? undefined,
    })),
    ...museums.map(({ slug, updatedAt }) => ({
      url: new URL(`/museums/${slug}`, siteUrl).toString(),
      lastModified: updatedAt ?? undefined,
    })),
  ];
}
