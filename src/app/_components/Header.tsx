import { revalidatePath } from "next/cache";
import Link from "next/link";

import { DesktopNav } from "~/app/_components/DesktopNav";
import { LandingSwitch } from "~/app/_components/LandingSwitch";
import { RegionSelector } from "~/app/_components/RegionSelector";
import { UserMenu } from "~/app/_components/UserMenu";
import { formatWeekdayDate } from "~/app/_lib/exhibition-format";
import { todayInHelsinki } from "~/domain/dates";
import { getI18n } from "~/i18n/server";
import { auth, signOut } from "~/server/auth";
import { getActiveRegions } from "~/server/regions-preference";
import { api } from "~/trpc/server";

export async function Header({
  omatEndingSoonCount = 0,
}: {
  omatEndingSoonCount?: number;
}) {
  const { t, locale } = await getI18n();
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
      <LandingSwitch
        signedIn={!!session?.user}
        landing={
          <div className="flex flex-col items-center pt-16 sm:pt-24">
            <h1 className="landing-rise text-headline text-center text-[20vw] leading-[0.85] tracking-[-0.04em] italic sm:text-[9.5rem]">
              {t.app.name}
            </h1>
            <p
              className="landing-rise text-kicker text-muted border-rule mt-4 border-t px-6 pt-2 sm:mt-6"
              style={{ "--i": 1 } as React.CSSProperties}
            >
              {formatWeekdayDate(todayInHelsinki(), locale)}
            </p>
          </div>
        }
      >
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
                  label={
                    session.user.name ??
                    session.user.email ??
                    t.profile.tabs.account
                  }
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
        <div className="border-rule grid grid-cols-[1fr_auto_1fr] items-center gap-x-6 border-y py-2">
          <p className="text-kicker text-muted whitespace-nowrap">
            {formatWeekdayDate(todayInHelsinki(), locale)}
          </p>
          <DesktopNav omatEndingSoonCount={omatEndingSoonCount} />
          <div className="col-start-3 flex min-w-0 justify-end">
            <RegionSelector
              key={session?.user?.id ?? "anon"}
              allRegions={allRegions}
              initialSelected={activeRegions}
              isSignedIn={!!session?.user}
            />
          </div>
        </div>
      </LandingSwitch>
    </header>
  );
}
