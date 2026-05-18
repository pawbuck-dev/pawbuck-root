import {
  isReviewInboxCandidate,
  summarizeAttachmentFailureReason,
} from "@/services/failedEmails";

describe("isReviewInboxCandidate", () => {
  it("includes success=false with pending review", () => {
    expect(
      isReviewInboxCandidate({
        success: false,
        failure_reason: null,
        review_status: "pending",
      })
    ).toBe(true);
  });

  it("includes legacy rows with failure_reason but success=true", () => {
    expect(
      isReviewInboxCandidate({
        success: true,
        failure_reason: "Failed to process 1 document(s): ...",
        review_status: "pending",
      })
    ).toBe(true);
  });

  it("excludes dismissed and resolved", () => {
    expect(
      isReviewInboxCandidate({
        success: false,
        failure_reason: "x",
        review_status: "dismissed",
      })
    ).toBe(false);
    expect(
      isReviewInboxCandidate({
        success: false,
        failure_reason: "x",
        review_status: "resolved",
      })
    ).toBe(false);
  });
});

describe("summarizeAttachmentFailureReason", () => {
  it("extracts detail after document filename", () => {
    expect(
      summarizeAttachmentFailureReason(
        "Failed to process 1 document(s): Document 'vaccinationrecord 2.pdf': Could not verify Pawsome: missing breed."
      )
    ).toBe("Could not verify Pawsome: missing breed.");
  });
});
