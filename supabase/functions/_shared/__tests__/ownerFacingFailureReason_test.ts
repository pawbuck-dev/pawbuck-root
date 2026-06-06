import { assertEquals } from "jsr:@std/assert";
import {
  formatOwnerFacingApiError,
  formatOwnerFacingEmailFailureSummary,
} from "../email-health-ingestion/ownerFacingFailureReason.ts";

Deno.test("formatOwnerFacingApiError parses analyze-internal JSON", () => {
  const msg = formatOwnerFacingApiError('{"error":"analyze-internal not configured"}');
  assertEquals(msg.includes("temporarily unavailable"), true);
  assertEquals(msg.includes("Confirm"), true);
});

Deno.test("formatOwnerFacingEmailFailureSummary includes confirm hint", () => {
  const msg = formatOwnerFacingEmailFailureSummary(1, ["breed mismatch"]);
  assertEquals(msg.includes("Confirm"), true);
});
