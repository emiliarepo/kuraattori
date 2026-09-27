import "~/styles/globals.css";

import { type Metadata, type Viewport } from "next";
import { Inter, Newsreader } from "next/font/google";

import { AppShell } from "~/app/_components/AppShell";
import { ServiceWorkerRegistration } from "~/app/_components/ServiceWorkerRegistration";
import { I18nProvider } from "~/i18n/client";
import { getI18n } from "~/i18n/server";
import { TRPCReactProvider } from "~/trpc/react";
import { siteUrl } from "~/app/_lib/site-url";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return {
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
}

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

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { locale } = await getI18n();
  return (
    <html lang={locale} className={`${newsreader.variable} ${inter.variable}`}>
      <body className="bg-bg text-fg">
        <TRPCReactProvider>
          <I18nProvider locale={locale}>
            <ServiceWorkerRegistration />
            <AppShell>{children}</AppShell>
          </I18nProvider>
        </TRPCReactProvider>
      </body>
    </html>
  );
}
