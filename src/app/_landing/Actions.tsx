import Link from "next/link";

import { type Messages } from "~/i18n";

export function Actions({ t }: { t: Messages }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
      <Link href="/feed" className="btn btn-primary">
        {t.landing.browse}
      </Link>
      <Link href="/sign-in" className="btn btn-secondary">
        {t.landing.signIn}
      </Link>
    </div>
  );
}
