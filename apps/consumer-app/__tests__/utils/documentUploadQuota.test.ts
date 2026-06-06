import { getDocumentUploadQuota } from "@/utils/documentUploadQuota";

describe("getDocumentUploadQuota", () => {
  it("returns unlimited for individual plan", () => {
    const q = getDocumentUploadQuota("individual", {
      plan: "individual",
      isFoundingMember: false,
      productId: null,
      expiresAt: null,
      usage: { miloConversationsUsed: 0, aiJournalEntriesUsed: 0 },
      limits: {
        maxPets: null,
        maxDocuments: null,
        maxFamilyMembers: 0,
        maxMiloConversations: null,
        maxAiJournalEntries: null,
      },
      foundingSpotsRemaining: null,
      documentCount: 99,
    });
    expect(q.atCap).toBe(false);
    expect(q.remaining).toBeNull();
  });

  it("blocks free users at document cap", () => {
    const q = getDocumentUploadQuota("free", {
      plan: "free",
      isFoundingMember: false,
      productId: null,
      expiresAt: null,
      usage: { miloConversationsUsed: 0, aiJournalEntriesUsed: 0 },
      limits: {
        maxPets: 1,
        maxDocuments: 10,
        maxFamilyMembers: 0,
        maxMiloConversations: 3,
        maxAiJournalEntries: 2,
      },
      foundingSpotsRemaining: 400,
      documentCount: 10,
    });
    expect(q.atCap).toBe(true);
    expect(q.remaining).toBe(0);
  });

  it("reports remaining documents for free users under cap", () => {
    const q = getDocumentUploadQuota("free", {
      plan: "free",
      isFoundingMember: false,
      productId: null,
      expiresAt: null,
      usage: { miloConversationsUsed: 0, aiJournalEntriesUsed: 0 },
      limits: {
        maxPets: 1,
        maxDocuments: 10,
        maxFamilyMembers: 0,
        maxMiloConversations: 3,
        maxAiJournalEntries: 2,
      },
      foundingSpotsRemaining: 400,
      documentCount: 7,
    });
    expect(q.atCap).toBe(false);
    expect(q.remaining).toBe(3);
  });
});
