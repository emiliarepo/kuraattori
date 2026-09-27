import { labelSize, type StampInk } from "~/domain/passport";

export const STAMP_WIDTH = 100;
export const STAMP_HEIGHT = 125;
const HOLE_RADIUS = 2.6;
const HOLE_GAP = 7.5;
const MARGIN = 8;
const FRAME = {
  x: MARGIN,
  y: MARGIN,
  width: STAMP_WIDTH - 2 * MARGIN,
  height: STAMP_HEIGHT - 2 * MARGIN,
};
const BAND_HEIGHT = 19.5;
export const LABEL_CENTER_Y = 52;
export const POSTMARK_CENTER = { x: 70, y: 90 };

export interface StampProps {
  id: number;
  label: string[];
  city: string | null;
  year: number;
  ink: StampInk;
  postmark: { date: string; rotation: number };
}

function holes(length: number) {
  const count = Math.round(length / HOLE_GAP);
  return Array.from({ length: count + 1 }, (_, i) => (i * length) / count);
}

export function Stamp({ id, label, city, year, ink, postmark }: StampProps) {
  const inkColor = `var(--stamp-${ink})`;
  const maskId = `stamp-mask-${id}`;
  const arcId = `stamp-arc-${id}`;
  const size = labelSize(label);
  const postmarkInk = {
    fill: "var(--stamp-postmark)",
    fillOpacity: 0.62,
    stroke: "none",
  };

  return (
    <svg
      viewBox={`0 0 ${STAMP_WIDTH} ${STAMP_HEIGHT}`}
      className="block h-auto w-full overflow-visible"
      aria-hidden
    >
      <defs>
        <mask id={maskId}>
          <rect width={STAMP_WIDTH} height={STAMP_HEIGHT} fill="white" />
          {holes(STAMP_WIDTH).flatMap((x) => [
            <circle key={`t${x}`} cx={x} cy={0} r={HOLE_RADIUS} />,
            <circle key={`b${x}`} cx={x} cy={STAMP_HEIGHT} r={HOLE_RADIUS} />,
          ])}
          {holes(STAMP_HEIGHT).flatMap((y) => [
            <circle key={`l${y}`} cx={0} cy={y} r={HOLE_RADIUS} />,
            <circle key={`r${y}`} cx={STAMP_WIDTH} cy={y} r={HOLE_RADIUS} />,
          ])}
        </mask>
        <path id={arcId} d="M -14.8 0 A 14.8 14.8 0 0 1 14.8 0" fill="none" />
      </defs>

      <rect
        width={STAMP_WIDTH}
        height={STAMP_HEIGHT}
        fill="var(--stamp-paper)"
        mask={`url(#${maskId})`}
      />
      <rect {...FRAME} fill="none" stroke={inkColor} strokeWidth={1.4} />
      <rect
        x={FRAME.x + 2.5}
        y={FRAME.y + 2.5}
        width={FRAME.width - 5}
        height={FRAME.height - 5}
        fill="none"
        stroke={inkColor}
        strokeWidth={0.5}
      />
      <rect
        x={FRAME.x + 2.5}
        y={FRAME.y + FRAME.height - BAND_HEIGHT - 2.5}
        width={FRAME.width - 5}
        height={BAND_HEIGHT}
        fill={inkColor}
      />

      <text
        x={STAMP_WIDTH - MARGIN - 6}
        y={MARGIN + 13}
        textAnchor="end"
        className="font-sans"
        fontSize={7}
        fontWeight={600}
        fill={inkColor}
        style={{ fontVariantNumeric: "lining-nums tabular-nums" }}
      >
        {year}
      </text>
      <text
        y={
          LABEL_CENTER_Y + size * 0.35 - ((label.length - 1) * size * 1.05) / 2
        }
        textAnchor="middle"
        className="font-serif italic"
        fontSize={size}
        fill={inkColor}
      >
        {label.map((line, index) => (
          <tspan
            key={index}
            x={STAMP_WIDTH / 2}
            dy={index === 0 ? 0 : size * 1.05}
          >
            {line}
          </tspan>
        ))}
      </text>
      {city && (
        <text
          x={STAMP_WIDTH / 2}
          y={FRAME.y + FRAME.height - 9.5}
          textAnchor="middle"
          className="font-sans uppercase"
          fontSize={city.length > 12 ? 4.6 : 5.4}
          fontWeight={600}
          letterSpacing={city.length > 12 ? 0.6 : 1}
          fill="var(--stamp-paper)"
        >
          {city}
        </text>
      )}

      <g
        transform={`translate(${POSTMARK_CENTER.x} ${POSTMARK_CENTER.y}) rotate(${postmark.rotation})`}
        fill="none"
        stroke="var(--stamp-postmark)"
        strokeOpacity={0.62}
      >
        <circle r={21} strokeWidth={1.3} />
        <circle r={12.5} strokeWidth={0.6} />
        <text
          className="font-sans"
          fontSize={4.4}
          fontWeight={600}
          letterSpacing={1}
          {...postmarkInk}
        >
          <textPath href={`#${arcId}`} startOffset="50%" textAnchor="middle">
            KURAATTORI
          </textPath>
        </text>
        <text
          y={1.7}
          textAnchor="middle"
          className="font-sans"
          fontSize={4.6}
          fontWeight={600}
          style={{ fontVariantNumeric: "lining-nums" }}
          {...postmarkInk}
        >
          {postmark.date}
        </text>
        {[-6, 0, 6].map((dy) => (
          <path
            key={dy}
            d={`M -24 ${dy} c -5 -3 -9 3 -14 0 s -9 -3 -14 0 s -9 3 -14 0 s -9 -3 -14 0`}
            strokeWidth={1.1}
          />
        ))}
      </g>
    </svg>
  );
}

export function EmptyStamp({ label }: { label: string[] }) {
  const size = labelSize(label);
  return (
    <svg
      viewBox={`0 0 ${STAMP_WIDTH} ${STAMP_HEIGHT}`}
      className="block h-auto w-full"
      aria-hidden
    >
      <rect
        x={2}
        y={2}
        width={STAMP_WIDTH - 4}
        height={STAMP_HEIGHT - 4}
        fill="none"
        stroke="var(--muted)"
        strokeWidth={1}
        strokeDasharray="4 3"
      />
      <text
        y={64 - ((label.length - 1) * size) / 2}
        textAnchor="middle"
        className="font-serif italic"
        fontSize={size}
        fill="var(--muted)"
      >
        {label.map((line, index) => (
          <tspan
            key={index}
            x={STAMP_WIDTH / 2}
            dy={index === 0 ? 0 : size * 1.05}
          >
            {line}
          </tspan>
        ))}
      </text>
    </svg>
  );
}
