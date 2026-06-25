import PlanComparisonModal from "@/components/subscription/PlanComparisonModal";
import { useTheme } from "@/context/themeContext";
import { render, screen } from "@testing-library/react-native";

jest.mock("@/context/themeContext", () => ({
  useTheme: jest.fn(),
}));

jest.mock("@/hooks/useSubscriptionOfferingPrices", () => ({
  useSubscriptionOfferingPrices: () => ({ data: null }),
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

describe("PlanComparisonModal", () => {
  beforeEach(() => {
    (useTheme as jest.Mock).mockReturnValue({
      theme: {
        foreground: "#111",
        primary: "#2BA89E",
        secondary: "#666",
        background: "#fff",
      },
      mode: "light",
    });
  });

  it("shows lifetime caps for free Milo and AI journal (not monthly)", () => {
    render(
      <PlanComparisonModal visible onClose={jest.fn()} currentPlan="free" readOnly />
    );

    expect(screen.getByText("3 Milo AI conversations (lifetime)")).toBeTruthy();
    expect(screen.getByText("2 AI journal entries (lifetime)")).toBeTruthy();
    expect(screen.queryByText(/\/ month/i)).toBeNull();
  });
});
