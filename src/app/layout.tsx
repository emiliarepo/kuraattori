import "~/styles/globals.css";

import { type Metadata } from "next";
import { Archivo } from "next/font/google";

import { AppShell } from "~/app/_components/AppShell";
import { t } from "~/i18n/fi";
import { TRPCReactProvider } from "~/trpc/react";

export const metadata: Metadata = {
  title: t.app.name,
  icons: [{ rel: "icon", url: "/favicon.ico" }],
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
