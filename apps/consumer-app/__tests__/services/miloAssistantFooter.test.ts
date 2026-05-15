import {
  MILO_HEALTH_ADVICE_FOOTER,
  resolveMiloAssistantFooter,
} from "@/services/miloAssistantFooter";

describe("resolveMiloAssistantFooter", () => {
  it("omits footer for product-only RAG replies", () => {
    expect(
      resolveMiloAssistantFooter({
        content: "### Steps\n\n1. Open Profile.\n2. Tap Manage Access.",
        usedRag: true,
        usedPetData: false,
      })
    ).toBeNull();
  });

  it("shows health footer when pet records were used", () => {
    expect(
      resolveMiloAssistantFooter({
        content: "### Summary\n\n**Rabies** on file.",
        usedPetData: true,
      })
    ).toBe(MILO_HEALTH_ADVICE_FOOTER);
  });

  it("omits footer for journal interview turns", () => {
    expect(
      resolveMiloAssistantFooter({
        content: "When did you first notice the limping?",
        isJournalMode: true,
      })
    ).toBeNull();
  });

  it("omits footer for document upload confirmations", () => {
    expect(
      resolveMiloAssistantFooter({
        content: "I've filed this under Vaccines for Rex, based on what Milo read in the file.",
      })
    ).toBeNull();
  });

  it("infers health footer from clinical summary shape without API flags", () => {
    expect(
      resolveMiloAssistantFooter({
        content: "### Summary\n\nAppetite has been lower this week.",
      })
    ).toBe(MILO_HEALTH_ADVICE_FOOTER);
  });

  it("omits footer for neutral general chat", () => {
    expect(
      resolveMiloAssistantFooter({
        content: "Great question — keeping a simple log helps you spot patterns over time.",
      })
    ).toBeNull();
  });
});
