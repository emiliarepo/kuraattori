import Link from "next/link";
import { notFound } from "next/navigation";

import { Section } from "~/app/_components/Section";
import {
  formatVisitDate,
  monthLabel,
  monthName,
} from "~/app/my/year/[yyyy]/format";
import { StatFigure } from "~/app/my/year/[yyyy]/StatFigure";
import { toYearReviewVisits } from "~/app/my/year/visits";
import { formatEuros, summarizeSavings } from "~/domain/savings";
import { summarizeYear } from "~/domain/year-review";
import { getI18n } from "~/i18n/server";
import { api } from "~/trpc/server";

export default async function ProfileYearPage({
  params,
}: {
  params: Promise<{ yyyy: string }>;
}) {
  const { t, locale } = await getI18n();
  const { yyyy } = await params;
  if (!/^\d{4}$/.test(yyyy)) notFound();
  const requestedYear = Number(yyyy);

  const items = await api.my.list({
    status: "visited",
    sort: "visited-newest",
    locale,
  });
  const visits = toYearReviewVisits(items, locale);
  const review = summarizeYear(visits, requestedYear);
  if (review?.year !== requestedYear) notFound();

  const savings = summarizeSavings(
    items.map((item) => ({
      title: item.titleFi,
      visitedAt: item.visitedAt,
      museumCardEligible: item.visitedCardEligible,
      admissionAdultCents: item.visitedAdmissionAdultCents,
      museumId: item.visitedMuseumId,
    })),
    requestedYear,
  )!;

  const maxMonthCount = review.busiestMonth.count;

  return (
    <div className="pb-10">
      <header className="border-rule border-b pb-6">
        <p className="text-kicker text-muted">{t.profile.year.kicker}</p>
        <h2 className="text-headline mt-2 text-5xl sm:text-7xl">
          {review.year}
        </h2>
        {review.years.length > 1 && (
          <nav
            aria-label={t.profile.year.years}
            className="mt-3 flex flex-wrap gap-x-4"
          >
            {review.years.map((year) => (
              <Link
                key={year}
                href={`/my/year/${year}`}
                aria-current={year === review.year ? "page" : undefined}
                className={`text-kicker py-1 tabular-nums ${year === review.year ? "text-signal" : ""}`}
              >
                {year}
              </Link>
            ))}
          </nav>
        )}
      </header>

      <div className="mt-8 grid grid-cols-3 gap-6">
        <StatFigure value={review.visitCount} label={t.profile.year.visits} />
        <StatFigure value={review.museumCount} label={t.profile.year.museums} />
        <StatFigure value={review.cityCount} label={t.profile.year.cities} />
      </div>

      <Section title={t.pages.my.savings.label}>
        <p className="text-headline text-4xl tabular-nums sm:text-5xl">
          {formatEuros(savings.savedCents, locale)}
        </p>
        <p className="text-muted mt-2 text-lg italic">
          {t.pages.my.savings.sentence(
            formatEuros(savings.savedCents, locale),
            review.year,
          )}
        </p>
        {savings.unpricedTitles.length > 0 && (
          <p className="text-muted mt-3 text-sm">
            <span className="text-kicker">{t.pages.my.savings.unpriced}</span>{" "}
            {savings.unpricedTitles.join(" · ")}
          </p>
        )}
      </Section>

      {review.topCategories.length > 0 && (
        <Section title={t.profile.year.categories}>
          <p className="text-muted font-sans text-sm">
            {review.topCategories.map((category, index) => (
              <span key={category.name}>
                {index > 0 && " · "}
                {category.name} ({category.count})
              </span>
            ))}
          </p>
        </Section>
      )}

      <Section title={t.profile.year.months}>
        <p className="text-muted mb-3 italic">
          {t.profile.year.busiestMonth(
            monthName(review.busiestMonth.month, locale),
            review.busiestMonth.count,
          )}
        </p>
        <ul className="grid grid-cols-[auto_1fr_auto] items-center gap-x-3">
          {review.months.map((month) => (
            <li
              key={month.month}
              className="col-span-3 grid grid-cols-subgrid items-center py-1"
            >
              <span className="text-kicker text-muted">
                {monthLabel(month.month, locale)}
              </span>
              <span className="bg-rule-soft h-3 flex-1" aria-hidden>
                <span
                  className="bg-fg block h-full"
                  style={{ width: `${(month.count / maxMonthCount) * 100}%` }}
                />
              </span>
              <span className="w-4 text-right text-sm tabular-nums">
                {month.count}
              </span>
            </li>
          ))}
        </ul>
      </Section>

      <Section
        title={
          review.visitCount === 1
            ? t.profile.year.visit
            : t.profile.year.firstVisit
        }
      >
        <dl className="grid gap-6 sm:grid-cols-2">
          <div>
            {review.visitCount > 1 && (
              <dt className="text-kicker text-muted">
                {t.profile.year.firstVisit}
              </dt>
            )}
            <dd className="text-headline text-xl">{review.firstVisit.title}</dd>
            <dd className="text-muted italic">
              {review.firstVisit.museumName} ·{" "}
              {formatVisitDate(review.firstVisit.visitedAt, locale)}
            </dd>
          </div>
          {review.visitCount > 1 && (
            <div>
              <dt className="text-kicker text-muted">
                {t.profile.year.latestVisit}
              </dt>
              <dd className="text-headline text-xl">
                {review.latestVisit.title}
              </dd>
              <dd className="text-muted italic">
                {review.latestVisit.museumName} ·{" "}
                {formatVisitDate(review.latestVisit.visitedAt, locale)}
              </dd>
            </div>
          )}
        </dl>
      </Section>
    </div>
  );
}
