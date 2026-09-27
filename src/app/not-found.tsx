import Link from "next/link";

import { t } from "~/i18n/fi";

export default function NotFound() {
  return (
    <div className="flex flex-col items-start gap-4 py-16">
      <h1 className="text-headline text-4xl">{t.pages.notFound.title}</h1>
      <p className="text-muted">{t.pages.notFound.body}</p>
      <Link href="/" className="text-fg font-semibold underline">
        {t.pages.notFound.home}
      </Link>
    </div>
  );
}
