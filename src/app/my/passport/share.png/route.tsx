import { getCloudflareContext } from "@opennextjs/cloudflare";
import { ImageResponse } from "next/og";

import {
  LABEL_CENTER_Y,
  labelSize,
  POSTMARK_CENTER,
} from "~/app/_components/Stamp";
import {
  buildPassport,
  postmarkDate,
  STAMP_INKS,
  STAMP_PAPER,
  STAMP_POSTMARK,
  stampLabel,
  stampLook,
  visitYear,
  type StampedMuseum,
} from "~/domain/passport";
import { t } from "~/i18n/fi";
import { siteUrl } from "~/app/_lib/site-url";
import { todayInHelsinki } from "~/domain/dates";
import { auth } from "~/server/auth";
import { api } from "~/trpc/server";

const SIZE = 1080;
const PAD = 64;
const GRID_TOP = 400;
const GRID_BOTTOM = SIZE - 120;
const GAP = 22;
const MAX_STAMPS = 60;
const PAGE_BG = "#f6f1e7";
const FG = "#1f1a14";
const MUTED = "#62594d";
const RULE_SOFT = "#ddd3c3";

async function loadFont(path: string, request: Request) {
  const url = new URL(path, request.url);
  const { env } = await getCloudflareContext({ async: true });
  const asset = await env.ASSETS?.fetch(url);
  const response = asset?.ok ? asset : await fetch(url);
  if (!response.ok) throw new Error(`font ${path}: ${response.status}`);
  return response.arrayBuffer();
}

function gridFor(count: number) {
  const area = { width: SIZE - 2 * PAD, height: GRID_BOTTOM - GRID_TOP };
  for (let cols = 1; ; cols++) {
    const width = Math.min(240, (area.width - (cols - 1) * GAP) / cols);
    const rows = Math.ceil(count / cols);
    if (rows * (width * 1.25 + GAP) - GAP <= area.height) return { width };
  }
}

function holes(length: number) {
  const count = Math.round(length / 7.5);
  return Array.from({ length: count + 1 }, (_, i) => (i * length) / count);
}

function stampBody(ink: string, postmarkRotation: number) {
  const circles = [
    ...holes(100).flatMap((x) => [
      `<circle cx="${x}" cy="0" r="2.6"/>`,
      `<circle cx="${x}" cy="125" r="2.6"/>`,
    ]),
    ...holes(125).flatMap((y) => [
      `<circle cx="0" cy="${y}" r="2.6"/>`,
      `<circle cx="100" cy="${y}" r="2.6"/>`,
    ]),
  ].join("");
  const waves = [-6, 0, 6]
    .map(
      (dy) =>
        `<path d="M -24 ${dy} c -5 -3 -9 3 -14 0 s -9 -3 -14 0 s -9 3 -14 0 s -9 -3 -14 0" stroke-width="1.1"/>`,
    )
    .join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-20 0 140 125" width="280" height="250">
<defs><mask id="m"><rect width="100" height="125" fill="#fff"/><g fill="#000">${circles}</g></mask></defs>
<rect width="100" height="125" fill="${STAMP_PAPER}" mask="url(#m)"/>
<rect x="8" y="8" width="84" height="109" fill="none" stroke="${ink}" stroke-width="1.4"/>
<rect x="10.5" y="10.5" width="79" height="104" fill="none" stroke="${ink}" stroke-width="0.5"/>
<rect x="10.5" y="95" width="79" height="19.5" fill="${ink}"/>
<g transform="translate(${POSTMARK_CENTER.x} ${POSTMARK_CENTER.y}) rotate(${postmarkRotation})" fill="none" stroke="${STAMP_POSTMARK}" stroke-opacity="0.62">
<circle r="21" stroke-width="1.3"/><circle r="12.5" stroke-width="0.6"/>${waves}</g>
</svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

function ShareStamp({
  museum,
  width,
}: {
  museum: StampedMuseum;
  width: number;
}) {
  const u = width / 100;
  const look = stampLook(museum.id);
  const ink = STAMP_INKS[look.ink];
  const label = stampLabel(museum.name);
  const size = labelSize(label) * u;
  const postmarkInk = { color: STAMP_POSTMARK, opacity: 0.62 };
  return (
    <div
      style={{
        display: "flex",
        position: "relative",
        width,
        height: width * 1.25,
        transform: `rotate(${look.rotation}deg)`,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={stampBody(ink, look.postmarkRotation)}
        width={width * 1.4}
        height={width * 1.25}
        style={{ position: "absolute", left: -20 * u, top: 0 }}
        alt=""
      />
      <div
        style={{
          position: "absolute",
          right: 14 * u,
          top: 14.5 * u,
          fontFamily: "Inter",
          fontSize: 7 * u,
          color: ink,
        }}
      >
        {String(visitYear(museum.firstVisitedAt))}
      </div>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: LABEL_CENTER_Y * u - (label.length * size * 1.05) / 2,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          fontFamily: "Newsreader",
          fontStyle: "italic",
          fontSize: size,
          lineHeight: 1.05,
          color: ink,
        }}
      >
        {label.map((line) => (
          <div key={line}>{line}</div>
        ))}
      </div>
      {museum.city && (
        <div
          style={{
            position: "absolute",
            left: 10.5 * u,
            width: 79 * u,
            top: 95 * u,
            height: 19.5 * u,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "Inter",
            fontSize: (museum.city.length > 12 ? 4.6 : 5.4) * u,
            letterSpacing: (museum.city.length > 12 ? 0.6 : 1) * u,
            color: STAMP_PAPER,
          }}
        >
          {museum.city.toUpperCase()}
        </div>
      )}
      <div
        style={{
          position: "absolute",
          left: (POSTMARK_CENTER.x - 21) * u,
          top: (POSTMARK_CENTER.y - 21) * u,
          width: 42 * u,
          height: 42 * u,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          transform: `rotate(${look.postmarkRotation}deg)`,
        }}
      >
        <div
          style={{
            fontFamily: "Inter",
            fontSize: 2.9 * u,
            ...postmarkInk,
          }}
        >
          KURAATTORI
        </div>
        <div
          style={{
            fontFamily: "Inter",
            fontSize: 4.6 * u,
            marginTop: 0.6 * u,
            ...postmarkInk,
          }}
        >
          {postmarkDate(museum.firstVisitedAt)}
        </div>
      </div>
    </div>
  );
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return new Response(null, { status: 401 });

  const copy = t.pages.my.passport;
  const [museums, stamps, serif, sans] = await Promise.all([
    api.museum.list(),
    api.my.stamps(),
    loadFont("/fonts/newsreader-italic-500.ttf", request),
    loadFont("/fonts/inter-600.ttf", request),
  ]);
  const passport = buildPassport(museums, stamps, copy.otherRegion);
  const stamped = passport.regions
    .flatMap((region) => region.stamped)
    .slice(0, MAX_STAMPS);
  const { width } = gridFor(Math.max(stamped.length, 1));
  const sansLabel = {
    fontFamily: "Inter",
    fontSize: 22,
    letterSpacing: 3,
    textTransform: "uppercase",
  } as const;

  return new ImageResponse(
    <div
      style={{
        width: SIZE,
        height: SIZE,
        display: "flex",
        flexDirection: "column",
        padding: PAD,
        background: PAGE_BG,
        color: FG,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          paddingBottom: 18,
          borderBottom: `2px solid ${FG}`,
        }}
      >
        <div
          style={{
            fontFamily: "Newsreader",
            fontStyle: "italic",
            fontSize: 56,
          }}
        >
          {t.app.name}
        </div>
        <div style={sansLabel}>
          {`${copy.tab} ${todayInHelsinki().slice(0, 4)}`}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          marginTop: 20,
          fontFamily: "Newsreader",
          fontStyle: "italic",
        }}
      >
        <div style={{ fontSize: 200, lineHeight: 1 }}>
          {String(passport.stampedCount)}
        </div>
        <div style={{ fontSize: 60, marginLeft: 20, marginBottom: 22 }}>
          {copy.shareImageTotal(passport.total)}
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          top: GRID_TOP,
          left: PAD,
          width: SIZE - 2 * PAD,
          height: GRID_BOTTOM - GRID_TOP,
          display: "flex",
          flexWrap: "wrap",
          alignContent: "center",
          justifyContent: "center",
          gap: GAP,
        }}
      >
        {stamped.map((museum) => (
          <ShareStamp key={museum.id} museum={museum} width={width} />
        ))}
      </div>
      <div
        style={{
          position: "absolute",
          left: PAD,
          right: PAD,
          bottom: PAD - 12,
          display: "flex",
          paddingTop: 16,
          borderTop: `1px solid ${RULE_SOFT}`,
          ...sansLabel,
          color: MUTED,
        }}
      >
        {siteUrl.host}
      </div>
    </div>,
    {
      width: SIZE,
      height: SIZE,
      fonts: [
        { name: "Newsreader", data: serif, style: "italic", weight: 500 },
        { name: "Inter", data: sans, style: "normal", weight: 600 },
      ],
      headers: { "Cache-Control": "private, no-store" },
    },
  );
}
