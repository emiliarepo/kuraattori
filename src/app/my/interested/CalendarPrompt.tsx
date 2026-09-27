import Link from "next/link";

import { siteUrl } from "~/app/_lib/site-url";
import { getI18n } from "~/i18n/server";

export async function CalendarPrompt({ token }: { token: string | null }) {
  const { t } = await getI18n();
  if (!token)
    return (
      <p className="mt-2 mb-4 font-sans text-sm">
        <Link
          href="/settings/calendar"
          className="hover:text-signal underline underline-offset-4"
        >
          {t.pages.my.calendarPrompt}
        </Link>
      </p>
    );

  const webcalUrl = new URL(`/api/calendar/${token}.ics`, siteUrl)
    .toString()
    .replace(/^https?:/, "webcal:");

  return (
    <p className="mt-2 mb-4 flex flex-wrap gap-x-5 gap-y-1 font-sans text-sm">
      <a
        href={webcalUrl}
        className="hover:text-signal underline underline-offset-4"
      >
        {t.profile.calendarAdd}
      </a>
      <Link
        href="/settings/calendar"
        className="hover:text-signal underline underline-offset-4"
      >
        {t.pages.my.calendarSettings}
      </Link>
    </p>
  );
}
