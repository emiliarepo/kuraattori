import Link from "next/link";

import { NAV_ITEMS } from "~/app/_components/nav";
import { RegionSelector, type Region } from "~/app/_components/RegionSelector";
import { t } from "~/i18n/fi";

export function Header({
  regions,
  onRegionsChange,
}: {
  regions: readonly Region[];
  onRegionsChange: (ids: string[]) => void;
}) {
  return (
    <header className="border-rule bg-bg sticky top-0 z-10 border-b">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="text-headline text-xl sm:text-2xl">
          {t.app.name}
        </Link>
        <nav aria-label="Päänavigaatio" className="hidden gap-6 sm:flex">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className="hover:text-signal text-sm font-semibold"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <RegionSelector regions={regions} onChange={onRegionsChange} />
      </div>
    </header>
  );
}
