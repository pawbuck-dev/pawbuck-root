import { getMiloStarterCardMeta } from "@/utils/miloStarterCardMeta";

describe("getMiloStarterCardMeta", () => {
  it("maps upload/document prompts to upload icon", () => {
    const meta = getMiloStarterCardMeta(
      "How do I upload insurance, invoices, or ID documents?",
      0
    );
    expect(meta.icon).toBe("cloud-upload-outline");
  });

  it("maps health hub prompts to pulse icon", () => {
    const meta = getMiloStarterCardMeta("What is on the Health Records hub screen?", 0);
    expect(meta.icon).toBe("pulse-outline");
  });

  it("maps calm/noise prompts to volume icon", () => {
    const meta = getMiloStarterCardMeta(
      "How can I help my pet stay calm during loud noises?",
      0
    );
    expect(meta.icon).toBe("volume-medium-outline");
  });

  it("maps product how-to prompts to help icon", () => {
    const meta = getMiloStarterCardMeta("How do I set up family sharing for my pet?", 0);
    expect(meta.icon).toBe("help-circle-outline");
  });

  it("falls back by index when no keyword matches", () => {
    const a = getMiloStarterCardMeta("Something unique xyz", 0);
    const b = getMiloStarterCardMeta("Something unique xyz", 1);
    expect(a.icon).not.toBe(b.icon);
  });
});
