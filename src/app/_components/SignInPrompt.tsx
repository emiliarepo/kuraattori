import Link from "next/link";

import { getI18n } from "~/i18n/server";

export async function SignInPrompt({ message }: { message: string }) {
  const { t } = await getI18n();
  return (
    <p className="text-muted text-lg italic">
      {message}{" "}
      <Link
        href="/sign-in"
        className="text-fg hover:text-signal font-sans text-sm font-semibold not-italic underline underline-offset-4"
      >
        {t.pages.signIn.cta}
      </Link>
    </p>
  );
}
