import OnboardingStep1 from "@/app/onboarding/step1";
import { fireEvent, render, screen } from "@testing-library/react-native";

let mockPush: jest.Mock;

jest.mock("expo-router", () => {
  mockPush = jest.fn();
  return {
    useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
  };
});

jest.mock("@/context/themeContext", () => ({
  useTheme: () => ({
    theme: {
      foreground: "#111",
      background: "#fff",
      primary: "#3BD0D2",
      primaryForeground: "#fff",
    },
    mode: "light",
  }),
}));

jest.mock("@/components/layout/Header", () => ({
  __esModule: true,
  default: () => null,
}));

describe("Onboarding step 1", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows PawBuck value prop and question count", () => {
    render(<OnboardingStep1 />);
    expect(screen.getByText("Welcome to PawBuck")).toBeTruthy();
    expect(screen.getByText(/nine quick questions/)).toBeTruthy();
  });

  it("navigates to step2 when Continue is pressed", () => {
    render(<OnboardingStep1 />);
    fireEvent.press(screen.getByText("Continue"));
    expect(mockPush).toHaveBeenCalledWith("/onboarding/step2");
  });
});
