import {
  MILO_DOCUMENT_FALLBACK_MESSAGE,
  MILO_DOCUMENT_TIMEOUT_MESSAGE,
} from "@pawbuck/api-client";
import { formatMiloUploadError } from "@/utils/miloUploadErrors";

describe("formatMiloUploadError", () => {
  it("maps HTML 504 body to friendly timeout copy", () => {
    const html =
      "<html><head><title>504 Gateway Time-out</title></head><body><center><h1>504 Gateway Time-out</h1></center></body></html>";
    expect(formatMiloUploadError(new Error(html))).toBe(MILO_DOCUMENT_TIMEOUT_MESSAGE);
  });

  it("passes through known api-client messages", () => {
    expect(formatMiloUploadError(new Error(MILO_DOCUMENT_TIMEOUT_MESSAGE))).toBe(
      MILO_DOCUMENT_TIMEOUT_MESSAGE
    );
  });

  it("returns fallback for unknown non-Error values", () => {
    expect(formatMiloUploadError(null)).toBe(MILO_DOCUMENT_FALLBACK_MESSAGE);
  });
});
