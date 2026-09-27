import Link from "next/link";

import { ExhibitionCard } from "~/app/_components/ExhibitionCard";
import { SECTION_LIMIT } from "~/app/_components/HomeFeed";
import { ImageFallback } from "~/app/_components/ImageFallback";
import { Stamp } from "~/app/_components/Stamp";
import { toRowView } from "~/app/_lib/row";
import { Actions } from "~/app/_landing/Actions";
import { ForYouDemo } from "~/app/_landing/ForYouDemo";
import { Reveal } from "~/app/_landing/Reveal";
import { todayInHelsinki } from "~/domain/dates";
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

  type Item = (typeof freshest)[number];
  const all: Item[] = [...freshest, ...endingSoon.items];
  const withReason = (item: Item) => {
    const row = toRowView(item, today, i18n);
    const place = item.museum.region
      ? t.regionName(item.museum.region)
      : row.city;
    const category = row.categories[0]?.label;
    return {
      ...row,
      whyLabel: [category && `${category} ★`, place]
        .filter(Boolean)
        .join(" · "),
    };
  };

  const [heroItem, ...rest] = all.filter((item) => item.categories.length);
  const hero = heroItem && withReason(heroItem);
  const picks = rest
    .filter((item) => item.id !== heroItem?.id)
    .slice(0, 2)
    .map(withReason);
  const interestNames = [
    ...new Set(picks.flatMap((pick) => pick.categories.map((c) => c.label))),
  ].slice(0, 2);

  const reminderItem =
    endingSoon.items.find((item) => item.endDate && item.endDate > today) ??
    endingSoon.items[0];
  const reminder = reminderItem && toRowView(reminderItem, today, i18n);

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
  const [heroStamp] = stamps;
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
      <section className="grid items-center gap-8 sm:min-h-[calc(100svh-15rem)] sm:grid-cols-[3fr_2fr] sm:gap-12">
        <div
          className="landing-rise flex flex-col items-center gap-4 text-center sm:items-start sm:gap-6 sm:text-left"
          style={{ "--i": 1 } as React.CSSProperties}
        >
          <h2 className="text-headline text-4xl sm:text-[3.5rem]">
            {t.landing.hero}
          </h2>
          <p className="text-muted max-w-md text-lg leading-snug">
            {t.landing.pitch}
          </p>
          <Actions t={t} />
        </div>

        {hero && (
          <div
            className="landing-rise relative mx-auto w-full max-w-sm sm:max-w-md"
            style={{ "--i": 2 } as React.CSSProperties}
          >
            <Link href={hero.href} className="group block">
              <ImageFallback
                sources={hero.imageSources}
                alt={hero.imageAlt}
                title={hero.title.text}
                aspectRatio="3 / 2"
                priority
              />
              <p className="mt-3 flex flex-col gap-1 pr-24">
                <span className="text-kicker text-signal truncate">
                  {t.pages.home.forYou} · {hero.whyLabel}
                </span>
                <span
                  lang={hero.title.lang}
                  className="text-headline text-2xl group-hover:underline group-hover:decoration-1 group-hover:underline-offset-4"
                >
                  {hero.title.text}
                </span>
                <span className="text-muted text-sm italic">
                  {hero.museum.text}
                  {hero.city && `, ${hero.city}`}
                </span>
              </p>
            </Link>
            {heroStamp && (
              <div
                className="absolute right-2 bottom-4 w-20 sm:-right-4 sm:w-24"
                style={{ rotate: `${heroStamp.rotation + 6}deg` }}
              >
                <Stamp {...heroStamp} />
              </div>
            )}
          </div>
        )}
      </section>

      <Feature index={1} copy={t.landing.forYou}>
        <div className="flex flex-col gap-8">
          {picks.length > 0 && (
            <ul className="grid grid-cols-2 gap-4 sm:gap-6">
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
      </Feature>

      <Feature index={2} copy={t.landing.reminders}>
        {reminder && (
          <div className="flex flex-col gap-4 font-sans">
            <div className="bg-surface flex gap-3 p-4">
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
            <div className="border-rule-soft flex items-center gap-4 border p-4">
              <div className="border-rule-soft flex shrink-0 flex-col items-center border-r pr-4">
                <span className="text-kicker text-muted">
                  {t.landing.reminders.calendar}
                </span>
                <span className="text-signal font-serif text-3xl tabular-nums">
                  {reminder.timeBar.endLabel.split(".")[0]}
                </span>
              </div>
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="text-sm font-semibold">
                  {t.notifications.calendarEnds(reminder.title.text)}
                </span>
                <span className="text-muted text-sm">
                  {reminder.museum.text} · {reminder.timeBar.endLabel}
                </span>
              </div>
            </div>
          </div>
        )}
      </Feature>

      <Feature index={3} copy={t.landing.passport}>
        <div className="flex flex-col gap-8">
          <ul className="bg-surface grid grid-cols-5 gap-2 p-4 sm:gap-4 sm:p-6">
            {stamps.map(({ rotation, ...stamp }) => (
              <li
                key={stamp.id}
                className="transition-transform duration-150 hover:-translate-y-1"
                style={{ rotate: `${rotation}deg` }}
              >
                <Stamp {...stamp} />
              </li>
            ))}
          </ul>
          <figure className="flex flex-col items-center gap-2">
            <figcaption className="text-kicker text-muted">
              {t.landing.passport.share}
            </figcaption>
            <p className="border-rule-soft border px-4 py-3 font-sans text-sm whitespace-pre-line">
              {shareText}
            </p>
          </figure>
        </div>
      </Feature>

      <Reveal className="border-rule-soft mt-12 border-t pt-12">
        <h2 className="text-kicker text-center">{t.landing.more.title}</h2>
        <ul className="mt-6 grid gap-6 text-center sm:grid-cols-3">
          {(
            [
              ["/trip", t.landing.more.trip],
              ["/trip/day", t.landing.more.day],
              ["/nearby", t.landing.more.nearby],
            ] as const
          ).map(([href, { title, body }]) => (
            <li key={href}>
              <Link href={href} className="group flex flex-col gap-1">
                <span className="text-headline text-2xl group-hover:underline">
                  {title}
                </span>
                <span className="text-muted">{body}</span>
              </Link>
            </li>
          ))}
        </ul>
      </Reveal>

      <Reveal className="border-rule mt-12 flex flex-col items-center gap-6 border-t pt-12 text-center">
        <p className="text-headline text-3xl sm:text-5xl">{t.landing.end}</p>
        <Actions t={t} />
      </Reveal>
    </div>
  );
}

function Feature({
  index,
  copy,
  children,
}: {
  index: number;
  copy: { kicker: string; title: string; body: string };
  children: React.ReactNode;
}) {
  return (
    <Reveal className="border-rule-soft mt-12 border-t pt-12">
      <div className="mx-auto flex max-w-xl flex-col items-center gap-3 text-center">
        <p className="text-kicker text-signal">
          {String(index).padStart(2, "0")} · {copy.kicker}
        </p>
        <h2 className="text-headline text-4xl sm:text-5xl">{copy.title}</h2>
        <p className="text-muted text-lg leading-snug">{copy.body}</p>
      </div>
      <div className="mx-auto mt-8 max-w-lg">{children}</div>
    </Reveal>
  );
}
