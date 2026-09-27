import { type MetadataRoute } from "next";

import { siteUrl } from "~/app/_lib/site-url";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/my", "/settings", "/welcome", "/sign-in", "/dev/"],
    },
    sitemap: new URL("/sitemap.xml", siteUrl).toString(),
  };
}
