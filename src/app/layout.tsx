import "~/styles/globals.css";

import { type Metadata } from "next";
import { Geist } from "next/font/google";

import { t } from "~/i18n/fi";
import { TRPCReactProvider } from "~/trpc/react";

export const metadata: Metadata = {
  title: t.app.name,
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fi" className={`${geist.variable}`}>
      <body className="bg-bg text-fg">
        <TRPCReactProvider>{children}</TRPCReactProvider>
      </body>
    </html>
  );
}
