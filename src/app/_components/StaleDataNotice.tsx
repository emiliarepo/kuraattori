import { INTL_LOCALE } from "~/i18n/locales";
import { getI18n } from "~/i18n/server";

export async function StaleDataNotice({
  lastImportAt,
}: {
  lastImportAt: string | null;
}) {
  const { t, locale } = await getI18n();
  const dateFormat = new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    day: "numeric",
    month: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Helsinki",
  });
  return (
    <p className="text-muted font-sans text-xs">
      {lastImportAt
        ? t.pages.updated(dateFormat.format(new Date(lastImportAt)))
        : t.pages.updatedUnknown}
    </p>
  );
}
