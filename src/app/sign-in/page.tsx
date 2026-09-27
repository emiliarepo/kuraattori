import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { t } from "~/i18n/fi";
import { auth, signIn } from "~/server/auth";
import { isTestAuthEnabled } from "~/server/auth/test-auth";
import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "Kirjaudu sisään",
  robots: { index: false, follow: false },
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const [session, { callbackUrl }, testAuthEnabled] = await Promise.all([
    auth(),
    searchParams,
    isTestAuthEnabled(),
  ]);
  const redirectTo = callbackUrl ?? "/welcome";
  if (session?.user) redirect(redirectTo);

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-8 py-12">
      <h1 className="text-headline text-4xl">{t.auth.signIn.title}</h1>

      <form
        action={async () => {
          "use server";
          revalidatePath("/", "layout");
          await signIn("google", { redirectTo });
        }}
      >
        <button
          type="submit"
          className="bg-fg text-bg w-full py-3 font-sans text-sm font-semibold"
        >
          {t.auth.signIn.google}
        </button>
      </form>

      {testAuthEnabled && (
        <form
          action={async (formData: FormData) => {
            "use server";
            revalidatePath("/", "layout");
            await signIn("dev", {
              ...Object.fromEntries(formData),
              redirectTo,
            });
          }}
          className="border-rule flex flex-col gap-3 border-t pt-8 font-sans"
        >
          <p className="text-kicker">{t.auth.signIn.devHeading}</p>
          <label className="flex flex-col gap-1 text-sm">
            {t.auth.signIn.devEmailLabel}
            <input
              type="email"
              name="email"
              defaultValue="dev@kuraattori.local"
              className="border-rule-soft bg-bg border px-2 py-2 text-base"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            {t.auth.signIn.devNameLabel}
            <input
              type="text"
              name="name"
              defaultValue="Devaaja"
              className="border-rule-soft bg-bg border px-2 py-2 text-base"
            />
          </label>
          <button
            type="submit"
            className="border-rule border py-2 text-sm font-semibold"
          >
            {t.auth.signIn.devSubmit}
          </button>
        </form>
      )}
    </div>
  );
}
