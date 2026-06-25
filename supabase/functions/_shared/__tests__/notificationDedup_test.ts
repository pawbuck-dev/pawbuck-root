import { assertEquals } from "jsr:@std/assert";

/** Pure window check used by claimNotificationDedupe semantics (documented behavior). */
function isWithinDedupeWindow(sentAtIso: string, windowMs: number, nowMs: number): boolean {
  const sentAt = new Date(sentAtIso).getTime();
  return sentAt > nowMs - windowMs;
}

Deno.test("notification dedupe window treats recent send as duplicate", () => {
  const now = Date.parse("2026-06-23T10:00:00Z");
  assertEquals(
    isWithinDedupeWindow("2026-06-23T09:50:00Z", 20 * 60 * 1000, now),
    true,
  );
  assertEquals(
    isWithinDedupeWindow("2026-06-23T09:30:00Z", 20 * 60 * 1000, now),
    false,
  );
});
