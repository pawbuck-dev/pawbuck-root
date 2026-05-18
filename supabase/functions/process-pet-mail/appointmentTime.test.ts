import {
  defaultEndFromCategory,
  resolveAppointmentUtcRange,
  wallTimeToUtc,
} from "./appointmentTime.ts";
import { assertEquals } from "jsr:@std/assert";

Deno.test("wallTimeToUtc converts America/Toronto wall time to UTC", () => {
  const utc = wallTimeToUtc("2026-07-15T16:00:00", "America/Toronto");
  if (!utc) throw new Error("expected utc");
  const hourUtc = new Date(utc).getUTCHours();
  assertEquals(typeof hourUtc, "number");
});

Deno.test("defaultEndFromCategory adds 2h for grooming", () => {
  const start = "2026-05-20T18:00:00.000Z";
  const end = defaultEndFromCategory("grooming", start);
  assertEquals(new Date(end).getTime() - new Date(start).getTime(), 2 * 60 * 60 * 1000);
});

Deno.test("resolveAppointmentUtcRange uses default end when end_at missing", () => {
  const range = resolveAppointmentUtcRange(
    {
      start_at: "2026-05-20T14:00:00",
      end_at: null,
      category: "vet",
    },
    "UTC"
  );
  if (!range) throw new Error("expected range");
  assertEquals(new Date(range.startUtc).toISOString(), "2026-05-20T14:00:00.000Z");
  assertEquals(
    new Date(range.endUtc).getTime() - new Date(range.startUtc).getTime(),
    60 * 60 * 1000
  );
});
