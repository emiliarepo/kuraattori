import { revalidatePath } from "next/cache";
import Link from "next/link";
import { redirect } from "next/navigation";

import { type Metadata } from "next";

import { LanguageSelector } from "~/app/_components/LanguageSelector";
import { getI18n } from "~/i18n/server";
import { auth, signIn } from "~/server/auth";
import { isTestAuthEnabled } from "~/server/auth/test-auth";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return {
    title: t.auth.signIn.title,
    robots: { index: false, follow: false },
  };
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { t } = await getI18n();
  const [session, { callbackUrl }, testAuthEnabled] = await Promise.all([
    auth(),
    searchParams,
    isTestAuthEnabled(),
  ]);
  const redirectTo = callbackUrl ?? "/welcome";
  if (session?.user) redirect(redirectTo);

  return (
    <div className="mx-auto max-w-sm py-8">
      <h1 className="text-headline mb-6 text-4xl">{t.auth.signIn.title}</h1>
      <div className="flex flex-col gap-8">
        <form
          action={async () => {
            "use server";
            revalidatePath("/", "layout");
            await signIn("google", { redirectTo });
          }}
        >
          <button type="submit" className="btn btn-primary w-full">
            {t.auth.signIn.google}
          </button>
        </form>

        <p className="text-muted -mt-4 font-sans text-xs">
          {t.auth.signIn.consentPrefix}
          <Link href="/terms" className="underline">
            {t.auth.signIn.consentTerms}
          </Link>
          {t.auth.signIn.consentJoin}
          <Link href="/privacy" className="underline">
            {t.auth.signIn.consentPrivacy}
          </Link>
        </p>

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
            <button type="submit" className="btn btn-secondary">
              {t.auth.signIn.devSubmit}
            </button>
          </form>
        )}

        <footer className="border-rule-soft border-t pt-6">
          <LanguageSelector />
        </footer>
      </div>
    </div>
  );
}
