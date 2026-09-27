import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import ErrorBoundary from "~/app/error";
import { t } from "~/i18n/fi";

describe("ErrorBoundary", () => {
  it("shows the friendly Finnish state, never the raw error or its digest", () => {
    const error = Object.assign(
      new Error("D1_ERROR: too many rows read: SQLITE_TOOBIG"),
      { digest: "1234567890" },
    );

    const html = renderToStaticMarkup(
      createElement(ErrorBoundary, { error, reset: () => undefined }),
    );

    expect(html).toContain(t.pages.error.title);
    expect(html).toContain(t.pages.error.body);
    expect(html).not.toContain(error.message);
    expect(html).not.toContain(error.digest);
  });
});
