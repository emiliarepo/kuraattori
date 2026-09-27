import { t as fi } from "~/i18n/fi";

export function createCalendarToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
}

export function escapeCalendarText(value: string) {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll("\r\n", "\n")
    .replaceAll("\r", "\n")
    .replaceAll("\n", "\\n")
    .replaceAll(",", "\\,")
    .replaceAll(";", "\\;");
}

export function foldCalendarLine(line: string) {
  const folded: string[] = [];
  let current = "";
  let bytes = 0;
  const encoder = new TextEncoder();
  for (const character of line) {
    const size = encoder.encode(character).length;
    if (bytes + size > 75) {
      folded.push(current);
      current = ` ${character}`;
      bytes = 1 + size;
    } else {
      current += character;
      bytes += size;
    }
  }
  folded.push(current);
  return folded.join("\r\n");
}

function calendarStamp(date: Date) {
  return date
    .toISOString()
    .replaceAll("-", "")
    .replaceAll(":", "")
    .replace(/\.\d{3}Z$/, "Z");
}

function wrapCalendar(events: readonly string[][]) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Kuraattori//Calendar//FI",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    ...events.flatMap((event) => ["BEGIN:VEVENT", ...event, "END:VEVENT"]),
    "END:VCALENDAR",
  ];
  return `${lines.map(foldCalendarLine).join("\r\n")}\r\n`;
}

export function formatCalendar(
  events: readonly CalendarEvent[],
  now = new Date(),
  summary: (title: string) => string = fi.notifications.calendarEnds,
) {
  const stamp = calendarStamp(now);
  return wrapCalendar(
    events.map((event) => {
      const end = new Date(`${event.endDate}T00:00:00Z`);
      end.setUTCDate(end.getUTCDate() + 1);
      return [
        `UID:${escapeCalendarText(event.uid)}`,
        `DTSTAMP:${stamp}`,
        `DTSTART;VALUE=DATE:${event.endDate.replaceAll("-", "")}`,
        `DTEND;VALUE=DATE:${end.toISOString().slice(0, 10).replaceAll("-", "")}`,
        `SUMMARY:${escapeCalendarText(summary(event.title))}`,
        `LOCATION:${escapeCalendarText(event.location)}`,
        `DESCRIPTION:${escapeCalendarText(`${event.startDate}–${event.endDate}\n${event.url}`)}`,
        `URL:${escapeCalendarText(event.url)}`,
      ];
    }),
  );
}

/** The UTC instant of a wall-clock `date` + `time` in Europe/Helsinki. */
export function helsinkiTimeToUtc(date: string, time: string): Date {
  const wall = Date.parse(`${date}T${time}:00Z`);
  const offsetAt = (instant: number) => {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat("en-GB", {
        timeZone: "Europe/Helsinki",
        hourCycle: "h23",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
        .formatToParts(new Date(instant))
        .map((part) => [part.type, part.value]),
    );
    return (
      Date.parse(
        `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:00Z`,
      ) - instant
    );
  };
  const guess = wall - offsetAt(wall);
  return new Date(wall - offsetAt(guess));
}

export type TimedCalendarEvent = {
  uid: string;
  start: Date;
  end: Date;
  title: string;
  location: string;
  description: string;
  url: string;
};

export function formatTimedCalendar(
  events: readonly TimedCalendarEvent[],
  now = new Date(),
) {
  const stamp = calendarStamp(now);
  return wrapCalendar(
    events.map((event) => [
      `UID:${escapeCalendarText(event.uid)}`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${calendarStamp(event.start)}`,
      `DTEND:${calendarStamp(event.end)}`,
      `SUMMARY:${escapeCalendarText(event.title)}`,
      `LOCATION:${escapeCalendarText(event.location)}`,
      `DESCRIPTION:${escapeCalendarText(event.description)}`,
      `URL:${escapeCalendarText(event.url)}`,
    ]),
  );
}

export type CalendarEvent = {
  uid: string;
  endDate: string;
  startDate: string;
  title: string;
  location: string;
  url: string;
};
