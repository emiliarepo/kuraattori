import { revalidatePath } from "next/cache";
import Link from "next/link";
import { redirect } from "next/navigation";

import { LanguageSelector } from "~/app/_components/LanguageSelector";
import { getI18n } from "~/i18n/server";
import { deleteUserData } from "~/server/account";
import { auth, signOut } from "~/server/auth";
import { getDb } from "~/server/db";

export default async function ProfileAccountPage({
  searchParams,
}: {
  searchParams: Promise<{ delete?: string }>;
}) {
  const { t } = await getI18n();
  const [session, { delete: confirmDelete }] = await Promise.all([
    auth(),
    searchParams,
  ]);
  if (!session?.user) redirect("/sign-in?callbackUrl=/profile");
  const user = session.user;

  return (
    <div className="flex flex-col gap-6">
      <dl className="flex flex-col gap-2.5 font-sans text-sm">
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-kicker">{t.profile.accountName}</dt>
          <dd>{user.name}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-kicker">{t.profile.accountEmail}</dt>
          <dd>{user.email}</dd>
        </div>
      </dl>

      <LanguageSelector />

      <div className="flex flex-wrap gap-3">
        <form
          action={async () => {
            "use server";
            revalidatePath("/", "layout");
            await signOut({ redirectTo: "/" });
          }}
        >
          <button type="submit" className="btn btn-secondary">
            {t.auth.signOut}
          </button>
        </form>
        <a href="/api/account/export" download className="btn btn-secondary">
          {t.profile.exportData}
        </a>
      </div>

      <div className="border-rule-soft flex flex-col gap-3 border-t pt-6 font-sans text-sm">
        {confirmDelete === "1" ? (
          <form
            action={async () => {
              "use server";
              const current = await auth();
              if (!current?.user?.id) redirect("/");
              await deleteUserData(await getDb(), current.user.id);
              revalidatePath("/", "layout");
              await signOut({ redirectTo: "/" });
            }}
            className="flex flex-col gap-3"
          >
            <p>{t.profile.deleteConfirm}</p>
            <div className="flex flex-wrap items-center gap-4">
              <button type="submit" className="btn bg-signal text-on-signal">
                {t.profile.deleteConfirmSubmit}
              </button>
              <Link href="/profile/account" className="underline">
                {t.profile.deleteCancel}
              </Link>
            </div>
          </form>
        ) : (
          <Link
            href="/profile/account?delete=1"
            className="text-muted self-start underline"
          >
            {t.profile.deleteAccount}
          </Link>
        )}
      </div>
    </div>
  );
}
