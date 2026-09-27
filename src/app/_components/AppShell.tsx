import { BottomTabBar } from "~/app/_components/BottomTabBar";
import { Header } from "~/app/_components/Header";
import { auth } from "~/server/auth";
import { api } from "~/trpc/server";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const omatEndingSoonCount = session?.user
    ? await api.my.endingSoonCount()
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
