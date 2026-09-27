import Link from "next/link";

import { BottomTabBar } from "~/app/_components/BottomTabBar";
import { Header } from "~/app/_components/Header";
import {
  PendingContent,
  PendingNavigationProvider,
} from "~/app/_components/PendingNavigation";
import { StaleDataNotice } from "~/app/_components/StaleDataNotice";
import { auth } from "~/server/auth";
import { api } from "~/trpc/server";
import { t } from "~/i18n/fi";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const session = await auth();
  // Falls back to 0 rather than crashing the masthead; the underlying
  // failure is already logged by the tRPC error-logging middleware.
  const [omatEndingSoonCount, lastImportAt] = await Promise.all([
    session?.user ? api.my.endingSoonCount().catch(() => 0) : 0,
    api.meta.lastImportAt().catch(() => null),
  ]);

  return (
    <PendingNavigationProvider>
      <Header omatEndingSoonCount={omatEndingSoonCount} />
      <main className="mx-auto max-w-5xl px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:px-6 sm:pb-8">
        <PendingContent>{children}</PendingContent>
        <footer className="border-rule-soft text-muted mt-12 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-0.5 border-t py-6 font-sans text-xs">
          <div className="flex gap-2">
            <Link href="/terms" className="hover:text-fg">
              {t.legal.terms}
            </Link>
            <span aria-hidden>·</span>
            <Link href="/privacy" className="hover:text-fg">
              {t.legal.privacy}
            </Link>
            <span aria-hidden>·</span>
            <a
              href="https://github.com/emiliarepo/kuraattori"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-fg"
            >
              GitHub
            </a>
          </div>
          <StaleDataNotice lastImportAt={lastImportAt} />
        </footer>
      </main>
      <BottomTabBar omatEndingSoonCount={omatEndingSoonCount} />
    </PendingNavigationProvider>
  );
}
