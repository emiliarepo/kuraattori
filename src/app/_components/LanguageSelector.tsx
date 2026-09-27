"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { setLocale } from "~/app/_components/locale-action";
import { usePendingNavigation } from "~/app/_components/PendingNavigation";
import { useI18n } from "~/i18n/client";
import { LOCALE_NAMES, LOCALES, type Locale } from "~/i18n/locales";

export function LanguageSelector() {
  const { t, locale } = useI18n();
  const [selected, setSelected] = useState<Locale>(locale);
  const router = useRouter();
  const { pending, start } = usePendingNavigation();

  function choose(next: Locale) {
    setSelected(next);
    start(async () => {
      await setLocale(next);
      router.refresh();
    });
  }

  return (
    <fieldset className="flex flex-col font-sans text-sm">
      <legend className="text-kicker mb-1 flex gap-3">
        {t.profile.language}
        {pending && (
          <span role="status" className="text-muted normal-case">
            {t.ui.updating}
          </span>
        )}
      </legend>
      {LOCALES.map((option) => (
        <label
          key={option}
          lang={option}
          className="flex min-h-11 items-center gap-3"
        >
          <input
            type="radio"
            name="locale"
            value={option}
            checked={selected === option}
            onChange={() => choose(option)}
            className="accent-signal h-4 w-4"
          />
          {LOCALE_NAMES[option]}
        </label>
      ))}
    </fieldset>
  );
}
