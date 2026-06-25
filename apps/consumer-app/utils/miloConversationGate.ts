import type { OpenPaywallOptions } from "@/constants/subscriptionPlans";

/** Block send when free-tier Milo lifetime cap is exhausted (null = unlimited). */
export function isMiloConversationBlocked(miloConversationsRemaining: number | null): boolean {
  return miloConversationsRemaining !== null && miloConversationsRemaining <= 0;
}

export type MiloConversationPaywallHandlers = {
  openPaywall: (options?: OpenPaywallOptions | string) => void;
  refetchEntitlement: () => Promise<void>;
};

/** Client-side pre-check before non-journal Milo chat API call. Returns true when blocked. */
export function blockMiloConversationWhenCapReached(
  miloConversationsRemaining: number | null,
  handlers: MiloConversationPaywallHandlers
): boolean {
  if (!isMiloConversationBlocked(miloConversationsRemaining)) return false;
  handlers.openPaywall({
    source: "milo_chat",
    requiredPlan: "individual",
    copyVariant: "milo_conversation_cap",
  });
  void handlers.refetchEntitlement();
  return true;
}
