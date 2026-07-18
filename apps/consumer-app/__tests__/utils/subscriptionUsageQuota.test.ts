import {
  canStartAiJournalEntry,
  getAiJournalEntriesRemaining,
  getMiloConversationsRemaining,
} from "@/utils/subscriptionUsageQuota";
import type { SubscriptionStatus } from "@/services/subscriptionStatusApi";

const freeStatus: SubscriptionStatus = {
  plan: "free",
  activePlan: "free",
  isFoundingMember: false,
  isAdminGrant: false,
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
  foundingSpotsRemaining: null,
  documentCount: 0,
};

describe("subscription usage quotas", () => {
  describe("getMiloConversationsRemaining", () => {
    it("returns null (unlimited) for individual and family", () => {
      expect(getMiloConversationsRemaining("individual", freeStatus)).toBeNull();
      expect(getMiloConversationsRemaining("family", freeStatus)).toBeNull();
    });

    it("returns remaining lifetime count for free tier", () => {
      expect(
        getMiloConversationsRemaining("free", {
          ...freeStatus,
          usage: { miloConversationsUsed: 2, aiJournalEntriesUsed: 0 },
        })
      ).toBe(1);
    });

    it("returns 0 when free Milo cap is exhausted", () => {
      expect(
        getMiloConversationsRemaining("free", {
          ...freeStatus,
          usage: { miloConversationsUsed: 3, aiJournalEntriesUsed: 0 },
        })
      ).toBe(0);
    });
  });

  describe("getAiJournalEntriesRemaining", () => {
    it("returns null (unlimited) for individual and family", () => {
      expect(getAiJournalEntriesRemaining("individual", freeStatus)).toBeNull();
      expect(getAiJournalEntriesRemaining("family", freeStatus)).toBeNull();
    });

    it("returns remaining lifetime count for free tier", () => {
      expect(
        getAiJournalEntriesRemaining("free", {
          ...freeStatus,
          usage: { miloConversationsUsed: 0, aiJournalEntriesUsed: 1 },
        })
      ).toBe(1);
    });

    it("returns 0 when free AI journal cap is exhausted", () => {
      expect(
        getAiJournalEntriesRemaining("free", {
          ...freeStatus,
          usage: { miloConversationsUsed: 0, aiJournalEntriesUsed: 2 },
        })
      ).toBe(0);
    });
  });

  describe("canStartAiJournalEntry", () => {
    it("allows new AI journal sessions while free quota remains", () => {
      expect(
        canStartAiJournalEntry("free", {
          ...freeStatus,
          usage: { miloConversationsUsed: 0, aiJournalEntriesUsed: 1 },
        })
      ).toBe(true);
    });

    it("blocks new AI journal sessions when free cap is reached", () => {
      expect(
        canStartAiJournalEntry("free", {
          ...freeStatus,
          usage: { miloConversationsUsed: 0, aiJournalEntriesUsed: 2 },
        })
      ).toBe(false);
    });

    it("always allows AI journal for paid tiers", () => {
      expect(canStartAiJournalEntry("individual", freeStatus)).toBe(true);
      expect(canStartAiJournalEntry("family", freeStatus)).toBe(true);
    });
  });
});
