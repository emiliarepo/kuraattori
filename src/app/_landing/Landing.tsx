import Link from "next/link";

import { DaysNumeral } from "~/app/_components/DaysNumeral";
import { ExhibitionCard } from "~/app/_components/ExhibitionCard";
import { SECTION_LIMIT } from "~/app/_components/HomeFeed";
import { ImageFallback } from "~/app/_components/ImageFallback";
import { Stamp } from "~/app/_components/Stamp";
import { dayCaption } from "~/app/_lib/exhibition-format";
import { toRowView } from "~/app/_lib/row";
import { Actions } from "~/app/_landing/Actions";
import { ForYouDemo } from "~/app/_landing/ForYouDemo";
import { Reveal } from "~/app/_landing/Reveal";
import { getDaysRemaining, todayInHelsinki } from "~/domain/dates";
import {
  postmarkDate,
  progressBar,
  stampLabel,
  stampLook,
} from "~/domain/passport";
import { getI18n } from "~/i18n/server";
import { getActiveRegions } from "~/server/regions-preference";
import { api } from "~/trpc/server";

const SHARE_EXAMPLE = {
  stamped: 38,
  total: 249,
  regions: [
    { region: "Pääkaupunkiseutu", stamped: 21, total: 64 },
    { region: "Tampere", stamped: 9, total: 27 },
    { region: "Turku", stamped: 5, total: 22 },
  ],
};

export async function Landing() {
  const i18n = await getI18n();
  const { t } = i18n;
  const today = todayInHelsinki();
  const activeRegions = await getActiveRegions();
  const emptyList = { items: [], nextCursor: null };
  const [endingSoon, freshest] = await Promise.all([
    api.exhibition
      .list({
        regions: [...activeRegions],
        state: "current",
        endingWithinDays: 14,
        limit: SECTION_LIMIT,
      })
      .catch(() => emptyList),
    api.exhibition
      .new({ regions: [...activeRegions], limit: SECTION_LIMIT })
      .catch(() => []),
  ]);

  const view = (item: (typeof freshest)[number]) =>
    toRowView(item, today, i18n);
  const leadItem = freshest[0] ?? endingSoon.items[0];
  const lead = leadItem && view(leadItem);
  const fresh = freshest
    .filter((item) => item !== leadItem)
    .slice(0, 3)
    .map(view);
  const closing = endingSoon.items.slice(0, 4).map((item) => ({
    view: view(item),
    days: getDaysRemaining(item, today) ?? 0,
  }));

  const all = [...freshest, ...endingSoon.items];
  const picks = all
    .filter((item) => item.categories.length > 0 && item !== leadItem)
    .slice(0, 2)
    .map((item) => {
      const row = view(item);
      const place = item.museum.region
        ? t.regionName(item.museum.region)
        : row.city;
      return {
        ...row,
        whyLabel: [`${row.categories[0]!.label} ★`, place]
          .filter(Boolean)
          .join(" · "),
      };
    });
  const interestNames = [
    ...new Set(picks.flatMap((pick) => pick.categories.map((c) => c.label))),
  ].slice(0, 2);

  const reminder =
    closing.find(({ days }) => days >= 7)?.view ?? closing[0]?.view;

  const year = Number(today.slice(0, 4));
  const seenMuseums = new Set<number>();
  const stamps = all
    .filter((item) => {
      if (seenMuseums.has(item.museum.id)) return false;
      seenMuseums.add(item.museum.id);
      return true;
    })
    .slice(0, 5)
    .map((item, index) => {
      const look = stampLook(item.museum.id);
      return {
        id: item.museum.id,
        label: stampLabel(item.museum.name),
        city: item.museum.city,
        year,
        ink: look.ink,
        rotation: look.rotation,
        postmark: {
          date: postmarkDate(
            new Date(Date.parse(today) - index * 9 * 86_400_000),
          ),
          rotation: look.postmarkRotation,
        },
      };
    });
  const shareText = [
    t.pages.my.passport.shareText.headline(
      year,
      SHARE_EXAMPLE.stamped,
      SHARE_EXAMPLE.total,
    ),
    SHARE_EXAMPLE.regions
      .map(
        ({ region, stamped, total }) =>
          `${t.regionName(region)} ${progressBar(stamped, total)}`,
      )
      .join(" · "),
  ].join("\n");

  return (
    <div className="pt-8">
      <div className="grid gap-8 sm:grid-cols-[2fr_1fr] sm:gap-10">
        <div className="flex flex-col gap-6">
          {lead && (
            <Link
              href={lead.href}
              className="landing-rise group -mx-4 block sm:mx-0"
              style={{ "--i": 1 } as React.CSSProperties}
            >
              <ImageFallback
                sources={lead.imageSources}
                alt={lead.imageAlt}
                title={lead.title.text}
                aspectRatio="3 / 2"
                priority
              />
              <p className="mt-3 flex flex-col gap-1 px-4 sm:px-0">
                <span className="text-kicker text-signal">
                  {t.landing.coverStory}
                </span>
                <span
                  lang={lead.title.lang}
                  className="text-headline text-xl group-hover:underline group-hover:decoration-1 group-hover:underline-offset-4 sm:text-4xl"
                >
                  {lead.title.text}
                </span>
                <span className="text-muted text-sm italic sm:text-base">
                  {lead.museum.text}
                  {lead.city && `, ${lead.city}`}
                </span>
              </p>
            </Link>
          )}
          <div
            className="landing-rise flex flex-col gap-4"
            style={{ "--i": 2 } as React.CSSProperties}
          >
            <p className="text-headline max-w-xl text-xl sm:text-2xl">
              {t.landing.pitch}
            </p>
            <Actions t={t} />
          </div>
        </div>

        <aside
          className="landing-rise flex flex-col gap-8"
          style={{ "--i": 3 } as React.CSSProperties}
        >
          <CoverLine title={t.landing.endingSoon} href="/exhibitions?ending=14">
            {closing.map(({ view, days }) => (
              <li key={view.href}>
                <Link href={view.href} className="group flex flex-col gap-0.5">
                  <DaysNumeral days={days} caption={dayCaption(days, i18n)} />
                  <span
                    lang={view.title.lang}
                    className="text-headline text-xl group-hover:underline"
                  >
                    {view.title.text}
                  </span>
                  <span className="text-muted text-sm italic">
                    {view.museum.text}
                  </span>
                </Link>
              </li>
            ))}
          </CoverLine>
          <CoverLine title={t.landing.fresh} href="/feed">
            {fresh.map((view) => (
              <li key={view.href}>
                <Link href={view.href} className="group flex flex-col gap-0.5">
                  <span
                    lang={view.title.lang}
                    className="text-headline text-xl group-hover:underline"
                  >
                    {view.title.text}
                  </span>
                  <span className="text-muted text-sm italic">
                    {view.museum.text}
                    {view.city && `, ${view.city}`}
                  </span>
                </Link>
              </li>
            ))}
          </CoverLine>
        </aside>
      </div>

      <section
        aria-labelledby="landing-personal"
        className="border-rule mt-12 border-t pt-6"
      >
        <p className="text-kicker text-signal">{t.landing.personal.kicker}</p>
        <h2
          id="landing-personal"
          className="text-headline mt-2 text-4xl sm:text-6xl"
        >
          {t.landing.personal.title}
        </h2>

        <Chapter index={1} copy={t.landing.forYou}>
          <div className="flex flex-col gap-8">
            {picks.length > 0 && (
              <ul className="grid grid-cols-2 gap-3 sm:gap-6">
                {picks.map((pick) => (
                  <li key={pick.href} className="flex">
                    <ExhibitionCard item={pick} />
                  </li>
                ))}
              </ul>
            )}
            {interestNames.length > 0 && (
              <ForYouDemo categories={interestNames} />
            )}
          </div>
        </Chapter>

        <Chapter index={2} copy={t.landing.reminders} flip>
          {reminder && (
            <div className="flex flex-col gap-4 font-sans">
              <div className="bg-surface flex gap-3 p-4 transition-transform duration-150 hover:-translate-y-0.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/icon-192.png"
                  alt=""
                  width={40}
                  height={40}
                  className="h-10 w-10 shrink-0"
                />
                <div className="flex min-w-0 flex-col gap-0.5">
                  <p className="text-muted flex justify-between gap-2 text-xs">
                    <span className="font-semibold">{t.app.name}</span>
                    <span>{t.landing.reminders.now}</span>
                  </p>
                  <p className="text-sm font-semibold">
                    {t.notifications.endsInWeek}: {reminder.title.text},{" "}
                    {reminder.museum.text}
                  </p>
                  <p className="text-muted text-sm">
                    {t.notifications.singleBody}
                  </p>
                </div>
              </div>
              <div className="border-rule-soft flex items-baseline gap-4 border-y py-3 text-sm">
                <span className="text-kicker text-muted shrink-0">
                  {t.landing.reminders.calendar}
                </span>
                <span className="text-signal shrink-0 font-semibold tabular-nums">
                  {reminder.timeBar.endLabel}
                </span>
                <span className="min-w-0">
                  {t.notifications.calendarEnds(reminder.title.text)}
                </span>
              </div>
            </div>
          )}
        </Chapter>

        <Chapter index={3} copy={t.landing.passport}>
          <div className="flex flex-col gap-6">
            <ul className="flex justify-center pt-2">
              {stamps.map(({ rotation, ...stamp }) => (
                <li
                  key={stamp.id}
                  className="-mx-1.5 w-20 transition-transform duration-150 hover:-translate-y-1 sm:-mx-1 sm:w-28"
                  style={{ rotate: `${rotation}deg` }}
                >
                  <Stamp {...stamp} />
                </li>
              ))}
            </ul>
            <figure className="flex flex-col gap-2">
              <figcaption className="text-kicker text-muted">
                {t.landing.passport.share}
              </figcaption>
              <p className="bg-surface p-4 font-sans text-sm whitespace-pre-line">
                {shareText}
              </p>
            </figure>
          </div>
        </Chapter>

        <Reveal className="border-rule-soft mt-10 border-t pt-6">
          <h3 className="text-kicker">{t.landing.more.title}</h3>
          <ul className="mt-4 grid gap-4 sm:grid-cols-3 sm:gap-6">
            {(
              [
                ["/trip", t.landing.more.trip],
                ["/trip/day", t.landing.more.day],
                ["/nearby", t.landing.more.nearby],
              ] as const
            ).map(([href, text]) => (
              <li key={href}>
                <Link
                  href={href}
                  className="hover:text-signal font-serif text-lg leading-snug transition-colors duration-150"
                >
                  {text}
                </Link>
              </li>
            ))}
          </ul>
        </Reveal>
      </section>

      <Reveal className="border-rule mt-12 flex flex-col gap-6 border-t pt-8">
        <p className="text-headline text-3xl sm:text-4xl">{t.landing.end}</p>
        <Actions t={t} />
      </Reveal>
    </div>
  );
}

function CoverLine({
  title,
  href,
  children,
}: {
  title: string;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-rule border-t pt-3">
      <h2 className="text-kicker mb-3">
        <Link href={href} className="hover:text-signal">
          {title}
        </Link>
      </h2>
      <ul className="flex flex-col gap-4">{children}</ul>
    </section>
  );
}

function Chapter({
  index,
  copy,
  flip = false,
  children,
}: {
  index: number;
  copy: { kicker: string; title: string; body: string };
  flip?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Reveal className="border-rule-soft mt-10 grid gap-6 border-t pt-6 sm:grid-cols-2 sm:items-center sm:gap-12">
      <div className={`flex flex-col gap-3 ${flip ? "sm:order-2" : ""}`}>
        <p className="text-kicker text-signal">
          {String(index).padStart(2, "0")} · {copy.kicker}
        </p>
        <h3 className="text-headline text-3xl sm:text-5xl">{copy.title}</h3>
        <p className="text-muted max-w-md text-lg leading-snug">{copy.body}</p>
      </div>
      <div>{children}</div>
    </Reveal>
  );
}
