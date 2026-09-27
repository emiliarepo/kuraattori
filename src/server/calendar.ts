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

export function formatCalendar(
  events: readonly CalendarEvent[],
  now = new Date(),
) {
  const stamp = now
    .toISOString()
    .replaceAll("-", "")
    .replaceAll(":", "")
    .replace(/\.\d{3}Z$/, "Z");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Kuraattori//Calendar//FI",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];
  for (const event of events) {
    const end = new Date(`${event.endDate}T00:00:00Z`);
    end.setUTCDate(end.getUTCDate() + 1);
    lines.push(
      "BEGIN:VEVENT",
      `UID:${escapeCalendarText(event.uid)}`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${event.endDate.replaceAll("-", "")}`,
      `DTEND;VALUE=DATE:${end.toISOString().slice(0, 10).replaceAll("-", "")}`,
      `SUMMARY:${escapeCalendarText(`Päättyy: ${event.title}`)}`,
      `LOCATION:${escapeCalendarText(event.location)}`,
      `DESCRIPTION:${escapeCalendarText(`${event.startDate}–${event.endDate}\n${event.url}`)}`,
      `URL:${escapeCalendarText(event.url)}`,
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return `${lines.map(foldCalendarLine).join("\r\n")}\r\n`;
}

export type CalendarEvent = {
  uid: string;
  endDate: string;
  startDate: string;
  title: string;
  location: string;
  url: string;
};
