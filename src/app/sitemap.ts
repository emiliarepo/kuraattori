import { type MetadataRoute } from "next";

import { siteUrl } from "~/app/_lib/site-url";
import { api } from "~/trpc/server";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { exhibitions, museums } = await api.meta.sitemapEntries();

  return [
    { url: new URL("/", siteUrl).toString() },
    { url: new URL("/exhibitions", siteUrl).toString() },
    { url: new URL("/museums", siteUrl).toString() },
    { url: new URL("/terms", siteUrl).toString() },
    { url: new URL("/privacy", siteUrl).toString() },
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
