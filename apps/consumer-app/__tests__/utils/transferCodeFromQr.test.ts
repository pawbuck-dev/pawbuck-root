import { extractTransferCodeFromQrPayload } from "@/utils/transferCodeFromQr";

describe("extractTransferCodeFromQrPayload", () => {
  it("returns plain TRF codes uppercased", () => {
    expect(extractTransferCodeFromQrPayload("trf-luna-2024-abc1")).toBe("TRF-LUNA-2024-ABC1");
  });

  it("reads transferCode from query strings", () => {
    expect(
      extractTransferCodeFromQrPayload(
        "https://pawbuck.app/transfer-pet?transferCode=TRF-LUNA-2024-ABC1",
      ),
    ).toBe("TRF-LUNA-2024-ABC1");
    expect(
      extractTransferCodeFromQrPayload("Pawbuck://transfer-pet?transferCode=trf-abc"),
    ).toBe("TRF-ABC");
  });

  it("returns null for empty payloads", () => {
    expect(extractTransferCodeFromQrPayload("")).toBeNull();
    expect(extractTransferCodeFromQrPayload("   ")).toBeNull();
  });
});
