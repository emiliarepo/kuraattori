import { type MetadataRoute } from "next";

import { siteUrl } from "~/app/_lib/site-url";
import { EDITION_REGIONS, editionSlugForRegion } from "~/domain/edition";
import { api } from "~/trpc/server";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { exhibitions, museums, editions } = await api.meta.sitemapEntries();

  return [
    { url: new URL("/", siteUrl).toString() },
    { url: new URL("/exhibitions", siteUrl).toString() },
    { url: new URL("/museums", siteUrl).toString() },
    { url: new URL("/terms", siteUrl).toString() },
    { url: new URL("/privacy", siteUrl).toString() },
    ...EDITION_REGIONS.map(({ slug }) => ({
      url: new URL(`/edition/${slug}`, siteUrl).toString(),
    })),
    ...editions.flatMap(({ region, date }) => {
      const slug = editionSlugForRegion(region);
      return slug
        ? [{ url: new URL(`/edition/${slug}/${date}`, siteUrl).toString() }]
        : [];
    }),
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
