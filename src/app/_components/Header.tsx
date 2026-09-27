import { revalidatePath } from "next/cache";
import Link from "next/link";

import { DesktopNav } from "~/app/_components/DesktopNav";
import { RegionSelector } from "~/app/_components/RegionSelector";
import { UserMenu } from "~/app/_components/UserMenu";
import { formatWeekdayDate } from "~/app/_lib/exhibition-format";
import { todayInHelsinki } from "~/domain/dates";
import { t } from "~/i18n/fi";
import { auth, signOut } from "~/server/auth";
import { getActiveRegions } from "~/server/regions-preference";
import { api } from "~/trpc/server";

export async function Header({
  omatEndingSoonCount = 0,
}: {
  omatEndingSoonCount?: number;
}) {
  const [session, allRegions, activeRegions] = await Promise.all([
    auth(),
    // Falls back to no regions rather than crashing the masthead; the
    // underlying failure is already logged by the tRPC error-logging
    // middleware. `getActiveRegions` degrades the same way on its own.
    api.system.regions().catch(() => []),
    getActiveRegions(),
  ]);

  return (
    <header className="mx-auto max-w-5xl px-4 sm:px-6">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center pt-4 pb-2 sm:pt-7 sm:pb-3">
        <span />
        <Link
          href="/"
          className="font-serif text-[2rem] leading-none tracking-tight italic sm:text-5xl"
        >
          {t.app.name}
        </Link>
        <div className="justify-self-end font-sans text-[0.8125rem]">
          {session?.user ? (
            <div className="hidden sm:block">
              <UserMenu
                label={session.user.name ?? session.user.email ?? "Tili"}
                signOutAction={async () => {
                  "use server";
                  revalidatePath("/", "layout");
                  await signOut({ redirectTo: "/" });
                }}
              />
            </div>
          ) : (
            <Link
              href="/sign-in"
              className="hover:text-signal hidden sm:inline"
            >
              {t.auth.signInLink}
            </Link>
          )}
        </div>
      </div>
      <div className="border-rule flex items-center justify-between gap-x-6 border-y py-2">
        <p className="text-kicker text-muted shrink-0 whitespace-nowrap">
          {formatWeekdayDate(todayInHelsinki())}
        </p>
        <DesktopNav omatEndingSoonCount={omatEndingSoonCount} />
        <RegionSelector
          key={session?.user?.id ?? "anon"}
          allRegions={allRegions}
          initialSelected={activeRegions}
          isSignedIn={!!session?.user}
        />
      </div>
    </header>
  );
}
