import Link from "next/link";

import { type Savings } from "~/domain/savings";
import { t } from "~/i18n/fi";

function formatEuros(cents: number): string {
  return new Intl.NumberFormat("fi-FI", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

export function SavingsHeader({ savings }: { savings: Savings }) {
  const amount = formatEuros(savings.savedCents);
  return (
    <section
      aria-label={t.pages.my.savings.label}
      className="border-rule-soft border-b pt-4 pb-6"
    >
      {savings.years.length > 1 && (
        <nav
          aria-label={t.pages.my.savings.years}
          className="mb-3 flex flex-wrap gap-x-4"
        >
          {savings.years.map((year) => (
            <Link
              key={year}
              href={`/my/visited?year=${year}`}
              aria-current={year === savings.year ? "page" : undefined}
              className={`text-kicker py-1 tabular-nums ${year === savings.year ? "text-signal" : ""}`}
            >
              {year}
            </Link>
          ))}
        </nav>
      )}
      <p aria-hidden className="text-headline text-5xl sm:text-6xl">
        {amount}
      </p>
      <p className="text-muted mt-2 text-lg italic">
        {t.pages.my.savings.sentence(amount, savings.year)}
      </p>
      {savings.unpricedTitles.length > 0 && (
        <p className="text-muted mt-3 text-sm">
          <span className="text-kicker">{t.pages.my.savings.unpriced}</span>{" "}
          {savings.unpricedTitles.join(" · ")}
        </p>
      )}
    </section>
  );
}
