import "~/styles/globals.css";

import { type Metadata, type Viewport } from "next";
import { Inter, Newsreader } from "next/font/google";

import { AppShell } from "~/app/_components/AppShell";
import { ServiceWorkerRegistration } from "~/app/_components/ServiceWorkerRegistration";
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
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: t.app.name,
  },
  other: {
    "apple-mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f1e7" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1612" },
  ],
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
          <ServiceWorkerRegistration />
          <AppShell>{children}</AppShell>
        </TRPCReactProvider>
      </body>
    </html>
  );
}
