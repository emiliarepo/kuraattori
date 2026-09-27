import "~/styles/globals.css";

import { type Metadata } from "next";
import { Archivo } from "next/font/google";

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

const grotesk = Archivo({
  subsets: ["latin"],
  weight: ["400", "600", "800"],
  variable: "--font-grotesk",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fi" className={grotesk.variable}>
      <body className="bg-bg text-fg">
        <TRPCReactProvider>
          <AppShell>{children}</AppShell>
        </TRPCReactProvider>
      </body>
    </html>
  );
}
