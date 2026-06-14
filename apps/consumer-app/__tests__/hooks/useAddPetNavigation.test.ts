import { useAddPetNavigation } from "@/hooks/useAddPetNavigation";
import { navigateToAddPetFlow } from "@/utils/navigateToAddPetFlow";
import { renderHook, act } from "@testing-library/react-native";

const mockOpenPaywall = jest.fn();
const mockResetOnboarding = jest.fn();
const mockPush = jest.fn();
const mockReplace = jest.fn();

jest.mock("@/context/subscriptionContext", () => ({
  useSubscription: () => ({
    plan: "individual",
    isLoading: false,
    openPaywall: mockOpenPaywall,
  }),
}));

jest.mock("@/context/onboardingContext", () => ({
  useOnboarding: () => ({
    resetOnboarding: mockResetOnboarding,
  }),
}));

jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
}));

jest.mock("@/utils/navigateToAddPetFlow", () => ({
  navigateToAddPetFlow: jest.fn(),
}));

describe("useAddPetNavigation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("opens Family paywall when user already has pets and is not on Family", () => {
    const { result } = renderHook(() => useAddPetNavigation());
    act(() => {
      result.current.navigateToAddPet(true);
    });
    expect(mockOpenPaywall).toHaveBeenCalledWith({
      source: "multi_pet",
      requiredPlan: "family",
    });
    expect(navigateToAddPetFlow).not.toHaveBeenCalled();
  });

  it("routes to onboarding for first pet without paywall", () => {
    const { result } = renderHook(() => useAddPetNavigation());
    act(() => {
      result.current.navigateToAddPet(false);
    });
    expect(mockOpenPaywall).not.toHaveBeenCalled();
    expect(navigateToAddPetFlow).toHaveBeenCalledWith(
      expect.objectContaining({ hasExistingPets: false, mode: "push" })
    );
  });
});
