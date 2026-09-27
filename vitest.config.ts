import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  oxc: {
    jsx: { runtime: "automatic" },
  },
  resolve: {
    alias: {
      "~": new URL("./src", import.meta.url).pathname,
    },
  },
  test: {
    // Playwright's suite, not vitest's.
    exclude: [...configDefaults.exclude, "e2e/**"],
  },
});
