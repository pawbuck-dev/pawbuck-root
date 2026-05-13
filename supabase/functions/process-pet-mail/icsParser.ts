/**
 * Minimal RFC 5545 VEVENT parser for calendar attachments (ICS).
 * Handles unfolded lines, DTSTART/DTEND (DATE and DATETIME, Zulu), UID, SUMMARY, LOCATION, DESCRIPTION.
 */

export type ParsedIcsEvent = {
  uid: string | null;
  dtstartRaw: string | null;
  dtendRaw: string | null;
  dtstartProp: string;
  dtendProp: string;
  summary: string | null;
  description: string | null;
  location: string | null;
};

function unfoldLines(raw: string): string[] {
  const normalized = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const parts = normalized.split("\n");
  const out: string[] = [];
  for (const part of parts) {
    if (part.length === 0) continue;
    if (/^[ \t]/.test(part) && out.length > 0) {
      out[out.length - 1] += part.slice(1);
    } else {
      out.push(part);
    }
  }
  return out;
}

function unescapeIcsText(s: string): string {
  return s
    .replace(/\\n/gi, "\n")
    .replace(/\\N/g, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\");
}

/** Split "PROP[;params]:value" */
function splitProperty(line: string): { name: string; params: string; value: string } | null {
  const m = line.match(/^([A-Za-z-]+)((?:;[^:]*)*):(.*)$/);
  if (!m) return null;
  return { name: m[1].toUpperCase(), params: m[2] ?? "", value: unescapeIcsText(m[3] ?? "") };
}

/**
 * Parse ICS datetime / date into ISO 8601 UTC string.
 * Floating local times (no Z, no TZID offset) are interpreted as UTC wall time (best-effort v1).
 */
export function icsValueToIsoUtc(propName: string, params: string, value: string): string | null {
  const v = value.trim();
  const p = `${propName}${params}`.toUpperCase();

  if (p.includes("VALUE=DATE") || /^\d{8}$/.test(v)) {
    const d = v.slice(0, 8);
    if (!/^\d{8}$/.test(d)) return null;
    const y = d.slice(0, 4);
    const mo = d.slice(4, 6);
    const da = d.slice(6, 8);
    return `${y}-${mo}-${da}T12:00:00.000Z`;
  }

  const m = v.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?$/);
  if (!m) return null;
  const [, y, mo, da, hh, mm, ss, z] = m;
  const isoLocal = `${y}-${mo}-${da}T${hh}:${mm}:${ss}.000`;
  if (z) return `${isoLocal.slice(0, -1)}Z`;
  return `${isoLocal}Z`;
}

export function parseIcsCalendarToEvents(icsText: string): ParsedIcsEvent[] {
  const text = icsText.trim().length === 0
    ? ""
    : icsText.includes("BEGIN:VCALENDAR")
    ? icsText
    : `BEGIN:VCALENDAR\n${icsText}\nEND:VCALENDAR`;

  const events: ParsedIcsEvent[] = [];
  const re = /BEGIN:VEVENT([\s\S]*?)END:VEVENT/gi;
  let blockMatch: RegExpExecArray | null;
  while ((blockMatch = re.exec(text)) !== null) {
    const block = blockMatch[1];
    const lines = unfoldLines(block);
    let uid: string | null = null;
    let dtstartRaw: string | null = null;
    let dtendRaw: string | null = null;
    let dtstartProp = "";
    let dtendProp = "";
    let summary: string | null = null;
    let description: string | null = null;
    let location: string | null = null;

    for (const line of lines) {
      const sp = splitProperty(line);
      if (!sp) continue;
      switch (sp.name) {
        case "UID":
          uid = sp.value.trim() || null;
          break;
        case "DTSTART":
          dtstartProp = `${sp.name}${sp.params}`;
          dtstartRaw = sp.value.trim();
          break;
        case "DTEND":
          dtendProp = `${sp.name}${sp.params}`;
          dtendRaw = sp.value.trim();
          break;
        case "SUMMARY":
          summary = sp.value.trim() || null;
          break;
        case "DESCRIPTION":
          description = sp.value.trim() || null;
          break;
        case "LOCATION":
          location = sp.value.trim() || null;
          break;
        default:
          break;
      }
    }

    if (dtstartRaw) {
      events.push({
        uid,
        dtstartRaw,
        dtendRaw,
        dtstartProp,
        dtendProp,
        summary,
        description,
        location,
      });
    }
  }
  return events;
}
