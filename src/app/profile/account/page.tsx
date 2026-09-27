import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { t } from "~/i18n/fi";
import { auth, signOut } from "~/server/auth";

export default async function ProfileAccountPage() {
  const session = await auth();
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

      <form
        action={async () => {
          "use server";
          revalidatePath("/", "layout");
          await signOut({ redirectTo: "/" });
        }}
      >
        <button
          type="submit"
          className="border-rule hover:bg-surface border px-4 py-2.5 font-sans text-sm font-semibold"
        >
          {t.auth.signOut}
        </button>
      </form>
    </div>
  );
}
