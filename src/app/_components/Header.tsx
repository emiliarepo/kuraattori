import { revalidatePath } from "next/cache";
import Link from "next/link";

import { NAV_ITEMS } from "~/app/_components/nav";
import { RegionSelector } from "~/app/_components/RegionSelector";
import { UserMenu } from "~/app/_components/UserMenu";
import { t } from "~/i18n/fi";
import { auth, signOut } from "~/server/auth";
import { getActiveRegions } from "~/server/regions-preference";
import { api } from "~/trpc/server";

export async function Header() {
  const [session, allRegions, activeRegions] = await Promise.all([
    auth(),
    api.system.regions(),
    getActiveRegions(),
  ]);

  return (
    <header className="border-rule bg-bg sticky top-0 z-10 border-b">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="text-headline text-xl sm:text-2xl">
          {t.app.name}
        </Link>
        <nav aria-label="Päänavigaatio" className="hidden gap-6 sm:flex">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className="hover:text-signal text-sm font-semibold"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-4">
          <RegionSelector
            key={`${session?.user?.id ?? "anon"}:${activeRegions.join(",")}`}
            allRegions={allRegions}
            initialSelected={activeRegions}
            isSignedIn={!!session?.user}
          />
          {session?.user ? (
            <UserMenu
              label={session.user.name ?? session.user.email ?? "Tili"}
              signOutAction={async () => {
                "use server";
                revalidatePath("/", "layout");
                await signOut({ redirectTo: "/" });
              }}
            />
          ) : (
            <Link
              href="/sign-in"
              className="hover:text-signal text-sm font-semibold"
            >
              {t.auth.signInLink}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
