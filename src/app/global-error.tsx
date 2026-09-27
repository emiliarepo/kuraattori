"use client";

import "~/styles/globals.css";
import { Inter, Newsreader } from "next/font/google";

import { t } from "~/i18n/fi";

/**
 * Replaces the root layout, so it can't reuse `AppShell`/`Header` (which
 * fetch session and region data) or anything else that could itself fail —
 * only a static masthead and self-hosted fonts, loaded the same way
 * `RootLayout` does.
 */
const newsreader = Newsreader({
  subsets: ["latin"],
  style: ["italic"],
  axes: ["opsz"],
  variable: "--font-newsreader",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="fi" className={`${newsreader.variable} ${inter.variable}`}>
      <body className="bg-bg text-fg">
        <header className="mx-auto max-w-5xl px-4 pt-4 pb-2 text-center sm:px-6 sm:pt-7">
          <span className="font-serif text-[2rem] leading-none tracking-tight italic sm:text-5xl">
            {t.app.name}
          </span>
        </header>
        <main className="mx-auto flex max-w-5xl flex-col items-start gap-4 px-4 py-16 sm:px-6">
          <h1 className="text-headline text-4xl sm:text-5xl">
            {t.pages.error.title}
          </h1>
          <p className="text-muted text-lg italic">{t.pages.error.body}</p>
          <button
            type="button"
            onClick={reset}
            className="bg-fg text-bg px-4 py-2.5 font-sans text-sm font-semibold"
          >
            {t.pages.error.retry}
          </button>
        </main>
      </body>
    </html>
  );
}
