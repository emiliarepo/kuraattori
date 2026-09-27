import { BottomTabBar } from "~/app/_components/BottomTabBar";
import { Header } from "~/app/_components/Header";
import { auth } from "~/server/auth";
import { api } from "~/trpc/server";

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
      </main>
      <BottomTabBar omatEndingSoonCount={omatEndingSoonCount} />
    </>
  );
}
