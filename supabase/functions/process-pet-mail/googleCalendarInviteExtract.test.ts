import { assertEquals } from "jsr:@std/assert";
import {
  extractGoogleCalendarStructuredInvite,
  extractInlineIcsAttachments,
  extractVCalendarBlocks,
  isGoogleCalendarInviteEmail,
  mergeCalendarAttachments,
  parseGoogleCalendarDateTime,
} from "./googleCalendarInviteExtract.ts";
import type { ParsedEmail } from "./types.ts";

const SAMPLE_ICS = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:test-uid@google.com
DTSTART:20260715T100000Z
DTEND:20260715T110000Z
SUMMARY:Vet Checkup
LOCATION:Happy Paws Clinic
END:VEVENT
END:VCALENDAR`;

const GOOGLE_HTML = `<!DOCTYPE html>
<html>
<head><title>Invitation: Vet Checkup</title></head>
<body>
  <div itemscope itemtype="http://schema.org/Event">
    <meta itemprop="startDate" content="20260715T100000Z">
    <meta itemprop="endDate" content="20260715T110000Z">
    <meta itemprop="name" content="Vet Checkup">
    <meta itemprop="location" content="Happy Paws Clinic">
  </div>
  <p>You have been invited to the following event.</p>
</body>
</html>`;

const GOOGLE_TEXT = `Invitation from Google Calendar

You have been invited to the following event.

Vet Checkup
When
Wed Jul 15, 2026 3pm – 4pm (India Standard Time)
Where
Happy Paws Clinic
`;

function baseEmail(overrides: Partial<ParsedEmail> = {}): ParsedEmail {
  return {
    from: { name: "Google Calendar", address: "calendar-notification@google.com" },
    to: [{ name: "", address: "milo6@pawbuck.app" }],
    cc: [],
    subject: "Invitation: Vet Checkup @ Wed Jul 15, 2026 3pm",
    date: "2026-07-12T10:00:00Z",
    messageId: "<test@mail>",
    textBody: GOOGLE_TEXT,
    htmlBody: GOOGLE_HTML,
    attachments: [],
    ...overrides,
  };
}

Deno.test("isGoogleCalendarInviteEmail detects Google invite signals", () => {
  assertEquals(isGoogleCalendarInviteEmail(baseEmail()), true);
  assertEquals(
    isGoogleCalendarInviteEmail(
      baseEmail({
        from: { name: "Me", address: "me@gmail.com" },
        subject: "Random subject",
        textBody: "Hello",
        htmlBody: null,
      }),
    ),
    false,
  );
});

Deno.test("extractVCalendarBlocks finds embedded ICS", () => {
  const blocks = extractVCalendarBlocks(`Email intro\n${SAMPLE_ICS}\nFooter`);
  assertEquals(blocks.length, 1);
  assertEquals(blocks[0]!.includes("BEGIN:VEVENT"), true);
});

Deno.test("extractInlineIcsAttachments builds calendar attachment from html body", () => {
  const email = baseEmail({ htmlBody: `<html><body>${SAMPLE_ICS}</body></html>`, attachments: [] });
  const inline = extractInlineIcsAttachments(email);
  assertEquals(inline.length, 1);
  assertEquals(inline[0]!.mimeType, "text/calendar");
});

Deno.test("mergeCalendarAttachments adds inline ICS when Mailgun had none", () => {
  const email = baseEmail({ htmlBody: `<html><body>${SAMPLE_ICS}</body></html>`, attachments: [] });
  const merged = mergeCalendarAttachments([], email);
  assertEquals(merged.length, 1);
});

Deno.test("parseGoogleCalendarDateTime handles compact Zulu timestamps", () => {
  assertEquals(parseGoogleCalendarDateTime("20260715T100000Z"), "2026-07-15T10:00:00.000Z");
});

Deno.test("extractGoogleCalendarStructuredInvite reads schema.org meta from Google HTML", () => {
  const invite = extractGoogleCalendarStructuredInvite(baseEmail(), 2026);
  assertEquals(invite?.summary, "Vet Checkup");
  assertEquals(invite?.location, "Happy Paws Clinic");
  assertEquals(invite?.startUtc, "2026-07-15T10:00:00.000Z");
  assertEquals(invite?.endUtc, "2026-07-15T11:00:00.000Z");
  assertEquals(invite?.source, "google_html");
});

Deno.test("extractGoogleCalendarStructuredInvite falls back to plain-text When block", () => {
  const invite = extractGoogleCalendarStructuredInvite(
    baseEmail({ htmlBody: null }),
    2026,
  );
  assertEquals(invite?.source, "google_text");
  assertEquals(Boolean(invite?.startUtc), true);
  assertEquals(invite?.summary, "Vet Checkup");
});
