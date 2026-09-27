import "~/styles/globals.css";

import { type Metadata } from "next";
import { Inter, Newsreader } from "next/font/google";

import { AppShell } from "~/app/_components/AppShell";
import { t } from "~/i18n/fi";
import { TRPCReactProvider } from "~/trpc/react";
import { siteUrl } from "~/app/_lib/site-url";

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: t.app.name,
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

const newsreader = Newsreader({
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
  variable: "--font-newsreader",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fi" className={`${newsreader.variable} ${inter.variable}`}>
      <body className="bg-bg text-fg">
        <TRPCReactProvider>
          <AppShell>{children}</AppShell>
        </TRPCReactProvider>
      </body>
    </html>
  );
}
