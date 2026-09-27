import Link from "next/link";
import { Fragment } from "react";

import { SignInPrompt } from "~/app/_components/SignInPrompt";
import { EmptyStamp, Stamp } from "~/app/_components/Stamp";
import { siteUrl } from "~/app/_lib/site-url";
import { SharePassportButton } from "~/app/my/passport/SharePassportButton";
import { todayInHelsinki } from "~/domain/dates";
import {
  buildPassport,
  passportShareText,
  postmarkDate,
  stampLabel,
  stampLook,
  visitDate,
  visitYear,
  type StampedMuseum,
} from "~/domain/passport";
import { INTL_LOCALE } from "~/i18n/locales";
import { getI18n } from "~/i18n/server";
import { auth } from "~/server/auth";
import { api } from "~/trpc/server";

export default async function MyPassportPage() {
  const { t, locale } = await getI18n();
  const copy = t.pages.my.passport;
  const session = await auth();
  if (!session?.user) return <SignInPrompt message={t.pages.signIn.my} />;

  const [museums, stamps] = await Promise.all([
    api.museum.list(),
    api.my.stamps(),
  ]);
  const passport = buildPassport(
    museums,
    stamps,
    copy.otherRegion,
    t.regionName,
    INTL_LOCALE[locale],
  );
  const stampedRegions = passport.regions.filter((r) => r.stamped.length);

  return (
    <div className="pt-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <p className="text-headline text-4xl tabular-nums sm:text-6xl">
          {copy.summary(passport.stampedCount, passport.total)}
        </p>
        {passport.stampedCount > 0 && (
          <SharePassportButton
            text={passportShareText(
              passport,
              Number(todayInHelsinki().slice(0, 4)),
              copy.shareText,
              t.regionName,
            )}
            url={siteUrl.origin}
          />
        )}
      </div>
      {stampedRegions.length > 0 ? (
        <p className="text-muted mt-3 font-sans text-sm">
          {stampedRegions.map((region, index) => (
            <Fragment key={region.region}>
              {index > 0 && " · "}
              <span className="whitespace-nowrap">
                {t.regionName(region.region)}{" "}
                {copy.regionCount(region.stamped.length, region.total)}
              </span>
            </Fragment>
          ))}
        </p>
      ) : (
        <p className="text-muted mt-3 text-lg italic">{copy.empty}</p>
      )}

      {passport.regions.map((region) => (
        <section
          key={region.region}
          aria-labelledby={`region-${region.region}`}
          className="border-rule-soft mt-4 border-t pt-5"
        >
          <div className="flex items-baseline justify-between gap-4">
            <h2
              id={`region-${region.region}`}
              className="text-headline text-2xl"
            >
              {t.regionName(region.region)}
            </h2>
            <p className="text-kicker text-muted tabular-nums">
              {copy.regionCount(region.stamped.length, region.total)}
            </p>
          </div>
          {region.stamped.length > 0 && (
            <ul className="bg-surface mt-4 grid grid-cols-3 gap-x-4 gap-y-6 p-4 sm:grid-cols-4 sm:gap-x-6 lg:grid-cols-6">
              {region.stamped.map((museum) => (
                <PassportStamp key={museum.id} museum={museum} />
              ))}
            </ul>
          )}
          {region.unstamped.length > 0 && (
            <details className={region.stamped.length ? "mt-2" : "mt-1"}>
              <summary className="text-kicker flex min-h-11 cursor-pointer items-center">
                {copy.unstamped(region.unstamped.length)}
              </summary>
              <ul className="grid grid-cols-3 gap-x-4 gap-y-4 pb-2 sm:grid-cols-4 sm:gap-x-6 lg:grid-cols-6">
                {region.unstamped.map((museum) => (
                  <li key={museum.id}>
                    <Link
                      href={`/museums/${museum.slug}`}
                      aria-label={museum.name}
                      className="block"
                    >
                      <EmptyStamp label={stampLabel(museum.name)} />
                    </Link>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </section>
      ))}
    </div>
  );
}

async function PassportStamp({ museum }: { museum: StampedMuseum }) {
  const copy = (await getI18n()).t.pages.my.passport;
  const look = stampLook(museum.id);
  return (
    <li style={{ transform: `rotate(${look.rotation}deg)` }}>
      <Link
        href={`/museums/${museum.slug}`}
        aria-label={copy.stampName(
          museum.name,
          museum.city,
          visitDate(museum.firstVisitedAt),
        )}
        className="block"
      >
        <Stamp
          id={museum.id}
          label={stampLabel(museum.name)}
          city={museum.city}
          year={visitYear(museum.firstVisitedAt)}
          ink={look.ink}
          postmark={{
            date: postmarkDate(museum.firstVisitedAt),
            rotation: look.postmarkRotation,
          }}
        />
      </Link>
    </li>
  );
}
