// @vitest-environment jsdom
import { createRequire } from "node:module";

import type * as ReactModule from "react";
import type * as ReactDomClient from "react-dom/client";
import { describe, expect, it } from "vitest";

// The app router hydrates in a transition, with the React that Next vendors
// rather than the app's own `react-dom`; see patches/next@*.patch.
const require = createRequire(import.meta.url);
const React = require("next/dist/compiled/react") as typeof ReactModule;
const { hydrateRoot } =
  require("next/dist/compiled/react-dom/client") as typeof ReactDomClient;

describe("hydration", () => {
  it("keeps its place when a host element's children resolve right after suspending", async () => {
    const html = "<main><div><p>sisältö</p></div></main>";
    const container = document.createElement("div");
    container.innerHTML = html;
    document.body.appendChild(container);
    const errors: unknown[] = [];

    React.startTransition(() => {
      hydrateRoot(
        container,
        React.createElement(
          "main",
          null,
          React.createElement(
            "div",
            null,
            Promise.resolve(React.createElement("p", null, "sisältö")),
          ),
        ),
        { onRecoverableError: (error) => errors.push(error) },
      );
    });
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(errors).toEqual([]);
    expect(container.innerHTML).toBe(html);
  });
});
