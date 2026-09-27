import { type Metadata } from "next";

import { CategoryList, type Category } from "~/app/_components/CategoryList";
import { DaysNumeral } from "~/app/_components/DaysNumeral";
import { ExhibitionRow } from "~/app/_components/ExhibitionRow";
import { ImageFallback } from "~/app/_components/ImageFallback";
import { LeadStory } from "~/app/_components/LeadStory";
import { Rail } from "~/app/_components/Rail";
import { Section } from "~/app/_components/Section";
import { EmptyStamp, Stamp } from "~/app/_components/Stamp";
import { postmarkDate, stampLabel, stampLook } from "~/domain/passport";
import { StatusActionsDemo } from "~/app/dev/components/StatusActionsDemo";
import { type TimeBarProps } from "~/app/_components/TimeBar";
import { UrgencyLabel } from "~/app/_components/UrgencyLabel";
import { type ExhibitionRowView } from "~/app/_lib/row";

export const metadata: Metadata = {
  title: "Komponentit — dev",
  robots: { index: false, follow: false },
};

// Snapshot date backing fixtures/museot/*.html (see docs/design.md §Import).
const TODAY = new Date("2026-09-27T00:00:00");

const shortDate = new Intl.DateTimeFormat("fi-FI", {
  day: "numeric",
  month: "numeric",
});
const longDate = new Intl.DateTimeFormat("fi-FI", {
  day: "numeric",
  month: "numeric",
  year: "numeric",
});

function daysBetween(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

function dateRangeLabels(startIso: string, endIso: string) {
  const start = new Date(`${startIso}T00:00:00`);
  const end = new Date(`${endIso}T00:00:00`);
  const sameYear = start.getFullYear() === end.getFullYear();
  return {
    startLabel: (sameYear ? shortDate : longDate).format(start),
    endLabel: longDate.format(end),
  };
}

function timeBarProps(startIso: string, endIso: string | null): TimeBarProps {
  const start = new Date(`${startIso}T00:00:00`);

  if (!endIso) {
    return {
      progress: null,
      startLabel: "",
      endLabel: "",
      remainingLabel:
        TODAY < start ? `Alkaa ${shortDate.format(start)}` : "Toistaiseksi",
      urgent: false,
    };
  }

  const { startLabel, endLabel } = dateRangeLabels(startIso, endIso);
  const end = new Date(`${endIso}T00:00:00`);

  if (TODAY < start) {
    return {
      progress: 0,
      startLabel,
      endLabel,
      remainingLabel: `Alkaa ${shortDate.format(start)}`,
      urgent: false,
    };
  }

  const remainingDays = daysBetween(TODAY, end);
  const totalDays = daysBetween(start, end);
  const elapsedDays = daysBetween(start, TODAY);
  const progress = totalDays > 0 ? (elapsedDays / totalDays) * 100 : 100;
  const urgent = remainingDays <= 14;

  const remainingLabel =
    remainingDays <= 0
      ? "Päättyy tänään"
      : urgent
        ? `${remainingDays} päivää jäljellä`
        : `${remainingDays} pv`;

  return { progress, startLabel, endLabel, remainingLabel, urgent };
}

function dayCaption(days: number) {
  return days === 1 ? "päivä" : "päivää";
}

// Hand-picked from fixtures/museot/listing-all.html (27.9.2026 snapshot).
// Real titles, museums and image URLs (hotlinking museot.fi); "no image" and
// "broken image" cases are deliberately introduced for the ImageFallback demo.
const EXHIBITIONS: {
  slug: string;
  title: string;
  museum: string;
  city: string;
  imageUrl: string | null;
  start: string;
  end: string | null;
  categories: Category[];
}[] = [
  {
    slug: "design-rautalampi",
    title: "Design Rautalampi – osaamisen ja yrittäjyyden pitäjä",
    museum: "Rautalammin museo",
    city: "Rautalampi",
    imageUrl:
      "https://museot.fi/uploadkuvat/museot/21714/Design-Rautalampi-1.jpg",
    start: "2026-04-21",
    end: "2026-09-30",
    categories: [{ label: "Design ja arkkitehtuuri" }, { label: "Käsityö" }],
  },
  {
    slug: "kesa-ett-hem",
    title: "Kesä Ett Hem -museossa",
    museum: "Ett Hem -museo",
    city: "Turku",
    imageUrl: "https://museot.fi/uploadkuvat/museot/21853/EttHem2.jpg",
    start: "2026-05-02",
    end: "2026-10-01",
    categories: [{ label: "Kotimuseot ja talomuseot" }],
  },
  {
    slug: "elaman-historia",
    title: "Elämän historia",
    museum: "LUOMUS Luonnontieteellinen museo",
    city: "Helsinki",
    imageUrl:
      "https://museot.fi/uploadkuvat/thumb/museot__keno__21106__keno__LUOMUS_synttrit_2018_1_jpg600x315.jpg",
    start: "2022-05-30",
    end: "2027-01-31",
    categories: [
      { label: "Luonto ja eläimet" },
      { label: "Tiede ja tekniikka" },
    ],
  },
  {
    slug: "uudisasukkaat",
    title: "Uudisasukkaat",
    museum: "Museo-Galleria Alariesto",
    city: "Sodankylä",
    imageUrl: "https://museot.fi/uploadkuvat/museot/9076/Nyttelyjuliste.jpg",
    start: "2026-01-24",
    end: "2026-12-09",
    categories: [{ label: "Historia" }, { label: "Satoja vuosia sitten" }],
  },
  {
    slug: "muumimukimania",
    title: "Muumimukimania",
    museum: "Muumimuseo",
    city: "Tampere",
    imageUrl:
      "https://museot.fi/uploadkuvat/museot/9090/_DSF0025-ryhmakuva-tyokopio.jpg",
    start: "2026-09-26",
    end: "2028-01-05",
    categories: [{ label: "Lapsille" }, { label: "Suuret suomalaiset" }],
  },
  {
    slug: "synergy-art-fest",
    title: "Synergy Art Fest",
    museum: "Tekniikan museo",
    city: "Helsinki",
    imageUrl:
      "https://museot.fi/uploadkuvat/museot/21136/Flyer-FacebookBanner.jpg",
    start: "2026-10-01",
    end: "2026-10-20",
    categories: [{ label: "Nykytaide" }, { label: "Musiikki" }],
  },
  {
    slug: "muistojen-raisio",
    title: "Muistojen Raisio -paikallishistoriallinen näyttely",
    museum: "Raision museo Harkko",
    city: "Raisio",
    imageUrl:
      "https://museot.fi/uploadkuvat/museot/22024/Logolla_Idid--FB-kansi--tapahtumakalenteri-_Muistojen-Raisio.jpg",
    start: "2026-10-09",
    end: "2027-01-10",
    categories: [{ label: "Historia" }],
  },
  {
    slug: "liikenaisen-synty",
    title: "Liikenaisen synty",
    museum: "Malmin talo, Pietarsaaren museo",
    city: "Pietarsaari",
    imageUrl: null,
    start: "2026-10-01",
    end: "2027-03-21",
    categories: [{ label: "Historia" }, { label: "Suuret suomalaiset" }],
  },
  {
    slug: "pelaaja-haastaja",
    title: "Pelaaja – haastaja",
    museum: "Museokeskus Vapriikki",
    city: "Tampere",
    imageUrl: "https://museot.fi/uploadkuvat/thumb/does-not-exist.jpg",
    start: "2026-10-10",
    end: "2027-05-09",
    categories: [{ label: "Tiede ja tekniikka" }, { label: "Lapsille" }],
  },
  {
    slug: "metsasuhteiden-maa",
    title: "Metsäsuhteiden maa – Näyttely metsän ja ihmisen yhteiselosta",
    museum: "Lusto - Suomen Metsämuseo",
    city: "Savonlinna",
    imageUrl:
      "https://museot.fi/uploadkuvat/thumb/museot__keno__21684__keno__Vaaka_kmpp_png600x315.png",
    start: "2024-05-17",
    end: null,
    categories: [{ label: "Luonto ja eläimet" }],
  },
];

const STAMP_MUSEUMS = [
  { id: 11, name: "Kiasma", city: "Helsinki" },
  { id: 12, name: "Museokeskus Vapriikki", city: "Tampere" },
  { id: 13, name: "Ett Hem -museo", city: "Turku" },
  { id: 14, name: "Lusto - Suomen Metsämuseo", city: "Savonlinna" },
  { id: 15, name: "Sinebrychoffin taidemuseo", city: "Helsinki" },
  {
    id: 16,
    name: "Urheilun ja liikunnan kulttuurikeskus TAHTO",
    city: "Helsinki",
  },
  { id: 17, name: "Malmin talo, Pietarsaaren museo", city: "Pietarsaari" },
  { id: 18, name: "Museo-Galleria Alariesto", city: "Sodankylä" },
];

const LEAD = EXHIBITIONS[2]!;
const ENDING_SOON = [EXHIBITIONS[0]!, EXHIBITIONS[1]!];

function toView(
  exhibition: (typeof EXHIBITIONS)[number],
  index: number,
): ExhibitionRowView {
  return {
    exhibitionId: index + 1,
    href: `/exhibitions/${exhibition.slug}`,
    title: exhibition.title,
    museum: exhibition.museum,
    city: exhibition.city,
    imageUrl: exhibition.imageUrl,
    imageAlt: `${exhibition.title}, ${exhibition.museum}`,
    categories: exhibition.categories,
    timeBar: timeBarProps(exhibition.start, exhibition.end),
    status: index === 0 ? "interested" : index === 3 ? "visited" : null,
    whyLabel: index === 2 ? "Luonto ja eläimet · Pääkaupunkiseutu" : null,
    visitedAt: index === 3 ? new Date("2026-09-27T12:00:00.000Z") : null,
    visitNote: null,
  };
}

export default function ComponentLibraryPage() {
  return (
    <div className="py-8">
      <h1 className="text-headline mb-2 text-4xl sm:text-5xl">
        Komponenttikirjasto
      </h1>
      <p className="text-muted mb-8 font-sans text-sm">
        Ei linkitetty, ei indeksoitu. Otsikko, tabit ja aluevalitsin näkyvät
        yllä olevassa sovelluskuoressa; mobiilin alanavigaatio näkyy alla 640
        px:n leveydellä.
      </p>

      <Section title="LeadStory">
        <LeadStory
          href={`/exhibitions/${LEAD.slug}`}
          imageUrl={LEAD.imageUrl}
          imageAlt={`${LEAD.title}, ${LEAD.museum}`}
          kicker="Sinulle · Luonto ja eläimet · Pääkaupunkiseutu"
          title={LEAD.title}
          museum={LEAD.museum}
          city={LEAD.city}
          urgencyLabel="126 päivää jäljellä"
        />
      </Section>

      <Rail
        title="Rail (ExhibitionCard)"
        emptyMessage="Ei näyttelyitä."
        more={{ href: "/exhibitions", label: "Kaikki" }}
        signedIn
        items={EXHIBITIONS.map((exhibition, index) => ({
          view: toView(exhibition, index),
        }))}
      />

      <Rail
        title="Rail, DaysNumeral (Päättyy pian)"
        emptyMessage="Ei näyttelyitä."
        signedIn
        items={ENDING_SOON.map((exhibition, index) => {
          const remaining = daysBetween(
            TODAY,
            new Date(`${exhibition.end}T00:00:00`),
          );
          return {
            view: toView(exhibition, index),
            lead: (
              <DaysNumeral days={remaining} caption={dayCaption(remaining)} />
            ),
          };
        })}
      />

      <Section title="Stamp (Museopassi)">
        <div className="bg-surface grid grid-cols-3 gap-x-4 gap-y-6 p-4 sm:grid-cols-4 lg:grid-cols-8">
          {STAMP_MUSEUMS.map((museum) => {
            const look = stampLook(museum.id);
            return (
              <div
                key={museum.id}
                style={{ transform: `rotate(${look.rotation}deg)` }}
              >
                <Stamp
                  id={museum.id}
                  label={stampLabel(museum.name)}
                  city={museum.city}
                  year={2026}
                  ink={look.ink}
                  postmark={{
                    date: postmarkDate(TODAY),
                    rotation: look.postmarkRotation,
                  }}
                />
              </div>
            );
          })}
          <EmptyStamp label={stampLabel("Museokeskus Vapriikki")} />
        </div>
      </Section>

      <Section title="UrgencyLabel">
        <div className="flex flex-wrap gap-2">
          <UrgencyLabel label="3 päivää jäljellä" />
          <UrgencyLabel label="Päättyy tänään" />
        </div>
      </Section>

      <Section title="DaysNumeral">
        <div className="flex flex-wrap gap-8">
          <DaysNumeral days={3} caption={dayCaption(3)} />
          <DaysNumeral days={1} caption={dayCaption(1)} />
          <DaysNumeral days={0} caption={dayCaption(0)} />
        </div>
      </Section>

      <Section title="StatusActions">
        <div className="max-w-sm">
          <StatusActionsDemo />
        </div>
      </Section>

      <Section title="CategoryList">
        <CategoryList categories={EXHIBITIONS[3]!.categories} />
      </Section>

      <Section title="ImageFallback">
        <div className="flex gap-4">
          <div className="w-32">
            <ImageFallback
              src={EXHIBITIONS[0]!.imageUrl}
              alt={EXHIBITIONS[0]!.title}
              title={EXHIBITIONS[0]!.title}
              aspectRatio="4 / 3"
            />
          </div>
          <div className="w-32">
            <ImageFallback
              src={null}
              alt={EXHIBITIONS[7]!.title}
              title={EXHIBITIONS[7]!.title}
              aspectRatio="4 / 3"
            />
          </div>
          <div className="w-32">
            <ImageFallback
              src="https://museot.fi/uploadkuvat/thumb/does-not-exist.jpg"
              alt={EXHIBITIONS[8]!.title}
              title={EXHIBITIONS[8]!.title}
              aspectRatio="4 / 3"
            />
          </div>
        </div>
      </Section>

      <Section title="ExhibitionRow (TimeBar, CategoryList, ImageFallback yhdessä)">
        <ul>
          {EXHIBITIONS.map((exhibition, index) => (
            <ExhibitionRow
              key={exhibition.slug}
              {...toView(exhibition, index)}
              signedIn
            />
          ))}
        </ul>
      </Section>
    </div>
  );
}
