/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";

/** @type {import("next").NextConfig} */
const config = {
  async redirects() {
    return [
      { source: "/profile/year", destination: "/my/year", permanent: true },
      {
        source: "/profile/year/:yyyy",
        destination: "/my/year/:yyyy",
        permanent: true,
      },
      { source: "/profile", destination: "/settings", permanent: true },
      {
        source: "/profile/:path*",
        destination: "/settings/:path*",
        permanent: true,
      },
    ];
  },
};

export default config;

import("@opennextjs/cloudflare").then((m) => m.initOpenNextCloudflareForDev());
