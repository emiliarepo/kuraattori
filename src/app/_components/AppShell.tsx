import { BottomTabBar } from "~/app/_components/BottomTabBar";
import { Header } from "~/app/_components/Header";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-5xl px-4 pb-20 sm:px-6 sm:pb-8">
        {children}
      </main>
      <BottomTabBar />
    </>
  );
}
