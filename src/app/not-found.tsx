import Link from "next/link";

import { getI18n } from "~/i18n/server";

export default async function NotFound() {
  const { t } = await getI18n();
  return (
    <div className="flex flex-col items-start gap-4 py-8">
      <h1 className="text-headline text-4xl sm:text-5xl">
        {t.pages.notFound.title}
      </h1>
      <p className="text-muted text-lg italic">{t.pages.notFound.body}</p>
      <Link
        href="/"
        className="hover:text-signal font-sans text-sm font-semibold underline underline-offset-4"
      >
        {t.pages.notFound.home}
      </Link>
    </div>
  );
}
