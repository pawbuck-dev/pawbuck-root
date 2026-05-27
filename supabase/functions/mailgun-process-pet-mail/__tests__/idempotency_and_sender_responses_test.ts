import { assertEquals } from "jsr:@std/assert@1";
import {
  isReviewInboxRow,
  STALE_PROCESSING_MS,
} from "../idempotencyChecker.ts";
import {
  buildBlockedResponse,
  buildPendingApprovalResponse,
} from "../handlers/responseBuilder.ts";

Deno.test("STALE_PROCESSING_MS is 15 minutes", () => {
  assertEquals(STALE_PROCESSING_MS, 15 * 60 * 1000);
});

Deno.test("isReviewInboxRow matches consumer review inbox rules", () => {
  assertEquals(isReviewInboxRow({ success: false }), true);
  assertEquals(isReviewInboxRow({ success: true, failure_reason: "breed mismatch" }), true);
  assertEquals(isReviewInboxRow({ success: true, review_status: "resolved" }), false);
  assertEquals(
    isReviewInboxRow({ success: true, review_status: "dismissed", failure_reason: "" }),
    false,
  );
  assertEquals(
    isReviewInboxRow({ success: true, review_status: "dismissed", failure_reason: "x" }),
    true,
  );
});

Deno.test("buildBlockedResponse returns 403 blocked status", async () => {
  const res = buildBlockedResponse(
    { id: "pet-1", name: "Rex" },
    { subject: "Hi", from: "bad@v.com", to: "x@pets.pawbuck.com", messageId: "<m>" },
    "bad@v.com",
  );
  assertEquals(res.status, 403);
  const body = await res.json();
  assertEquals(body.status, "blocked");
});

Deno.test("buildPendingApprovalResponse returns 202 pending", async () => {
  const res = buildPendingApprovalResponse(
    { id: "pet-1", name: "Rex" },
    { subject: "Hi", from: "new@v.com", to: "x@pets.pawbuck.com", messageId: "<m>" },
    "new@v.com",
    "pending-1",
  );
  assertEquals(res.status, 202);
  const body = await res.json();
  assertEquals(body.status, "pending_approval");
  assertEquals(body.pendingApprovalId, "pending-1");
});
