import Link from "next/link";

import { t } from "~/i18n/fi";

export function SignInPrompt({ message }: { message: string }) {
  return (
    <p className="text-muted py-6 text-lg italic">
      {message}{" "}
      <Link
        href="/sign-in"
        className="text-signal font-sans text-sm font-semibold not-italic underline underline-offset-4"
      >
        {t.pages.signIn.cta}
      </Link>
    </p>
  );
}
