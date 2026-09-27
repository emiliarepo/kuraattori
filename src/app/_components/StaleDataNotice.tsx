import { t } from "~/i18n/fi";

const dateFormat = new Intl.DateTimeFormat("fi-FI", {
  day: "numeric",
  month: "numeric",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function StaleDataNotice({
  lastImportAt,
}: {
  lastImportAt: string | null;
}) {
  return (
    <p className="text-muted text-xs">
      {lastImportAt
        ? t.pages.updated(dateFormat.format(new Date(lastImportAt)))
        : t.pages.updatedUnknown}
    </p>
  );
}
