import Link from "next/link";

import { BottomTabBar } from "~/app/_components/BottomTabBar";
import { Header } from "~/app/_components/Header";
import { auth } from "~/server/auth";
import { api } from "~/trpc/server";
import { t } from "~/i18n/fi";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const session = await auth();
  // Falls back to 0 rather than crashing the masthead; the underlying
  // failure is already logged by the tRPC error-logging middleware.
  const omatEndingSoonCount = session?.user
    ? await api.my.endingSoonCount().catch(() => 0)
    : 0;

  return (
    <>
      <Header omatEndingSoonCount={omatEndingSoonCount} />
      <main className="mx-auto max-w-5xl px-4 pb-20 sm:px-6 sm:pb-8">
        {children}
        <footer className="border-rule-soft text-muted mt-12 flex gap-2 border-t py-6 font-sans text-xs">
          <Link href="/terms" className="hover:text-fg">
            {t.legal.terms}
          </Link>
          <span aria-hidden>·</span>
          <Link href="/privacy" className="hover:text-fg">
            {t.legal.privacy}
          </Link>
        </footer>
      </main>
      <BottomTabBar omatEndingSoonCount={omatEndingSoonCount} />
    </>
  );
}
