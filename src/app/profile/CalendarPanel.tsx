"use client";

import { useState } from "react";

import { t } from "~/i18n/fi";
import { api } from "~/trpc/react";

export function CalendarPanel({
  initialCalendarUrl,
}: {
  initialCalendarUrl: string;
}) {
  const [calendarUrl, setCalendarUrl] = useState(initialCalendarUrl);
  const [copied, setCopied] = useState(false);
  const rotateCalendarFeed = api.profile.rotateCalendarFeed.useMutation({
    onSuccess: ({ token }) => {
      const nextUrl = new URL(calendarUrl);
      nextUrl.pathname = `/api/calendar/${token}.ics`;
      setCalendarUrl(nextUrl.toString());
      setCopied(false);
    },
  });

  return (
    <div className="flex flex-col gap-3">
      <p className="text-muted text-sm">{t.profile.calendarDescription}</p>
      <label className="text-kicker" htmlFor="calendar-url">
        {t.profile.calendarHeading}
      </label>
      <input
        id="calendar-url"
        readOnly
        value={calendarUrl}
        className="border-rule-soft bg-bg min-w-0 border px-3 py-2 font-sans text-sm"
      />
      <div className="flex flex-wrap gap-x-5 gap-y-3 font-sans text-sm">
        <button
          type="button"
          className="hover:text-signal underline underline-offset-4"
          onClick={async () => {
            await navigator.clipboard.writeText(calendarUrl);
            setCopied(true);
          }}
        >
          {copied ? t.profile.calendarCopied : t.profile.calendarCopy}
        </button>
        <a
          href={calendarUrl.replace(/^https?:/, "webcal:")}
          className="hover:text-signal underline underline-offset-4"
        >
          {t.profile.calendarAdd}
        </a>
        <button
          type="button"
          className="hover:text-signal underline underline-offset-4"
          disabled={rotateCalendarFeed.isPending}
          onClick={() => {
            if (window.confirm(t.profile.calendarRotateConfirm))
              rotateCalendarFeed.mutate();
          }}
        >
          {t.profile.calendarRotate}
        </button>
      </div>
    </div>
  );
}
