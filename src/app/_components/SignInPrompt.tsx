import Link from "next/link";

import { t } from "~/i18n/fi";

export function SignInPrompt({ message }: { message: string }) {
  return (
    <p className="text-muted py-8 text-sm">
      {message}{" "}
      <Link href="/sign-in" className="text-fg font-semibold underline">
        {t.pages.signIn.cta}
      </Link>
    </p>
  );
}
