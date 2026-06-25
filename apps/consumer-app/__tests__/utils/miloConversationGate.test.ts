import {
  blockMiloConversationWhenCapReached,
  isMiloConversationBlocked,
} from "@/utils/miloConversationGate";

describe("miloConversationGate", () => {
  it("treats null remaining as unlimited", () => {
    expect(isMiloConversationBlocked(null)).toBe(false);
  });

  it("blocks when free lifetime cap is exhausted", () => {
    expect(isMiloConversationBlocked(0)).toBe(true);
    expect(isMiloConversationBlocked(-1)).toBe(true);
  });

  it("allows send when quota remains", () => {
    expect(isMiloConversationBlocked(1)).toBe(false);
  });

  it("opens paywall and returns true when cap reached", () => {
    const openPaywall = jest.fn();
    const refetchEntitlement = jest.fn().mockResolvedValue(undefined);

    const blocked = blockMiloConversationWhenCapReached(0, { openPaywall, refetchEntitlement });

    expect(blocked).toBe(true);
    expect(openPaywall).toHaveBeenCalledWith({
      source: "milo_chat",
      requiredPlan: "individual",
      copyVariant: "milo_conversation_cap",
    });
    expect(refetchEntitlement).toHaveBeenCalled();
  });

  it("returns false without opening paywall when quota remains", () => {
    const openPaywall = jest.fn();
    const blocked = blockMiloConversationWhenCapReached(2, {
      openPaywall,
      refetchEntitlement: jest.fn(),
    });
    expect(blocked).toBe(false);
    expect(openPaywall).not.toHaveBeenCalled();
  });
});
