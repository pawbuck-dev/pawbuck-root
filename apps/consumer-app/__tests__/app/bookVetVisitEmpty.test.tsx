import type { ReactNode } from "react";
import BookVetVisitScreen from "@/app/(home)/book-vet-visit/index";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

let mockPush: jest.Mock;
let mockBack: jest.Mock;

jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
}));

jest.mock("expo-router", () => {
  mockPush = jest.fn();
  mockBack = jest.fn();
  return {
    useRouter: () => ({ push: mockPush, back: mockBack, replace: jest.fn() }),
  };
});

jest.mock("expo-linear-gradient", () => ({
  LinearGradient: ({ children }: { children: ReactNode }) => {
    const { View } = require("react-native");
    return <View>{children}</View>;
  },
}));

jest.mock("@/utils/openGoogleMapsDirections", () => ({
  openGoogleMapsDrivingDirections: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/components/home/BottomNavBar", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("@/components/booking/VetClinicMap", () => ({
  VetClinicMap: () => null,
}));

jest.mock("@/components/booking/BookingFlowHeader", () => ({
  BookingFlowHeader: () => null,
}));

jest.mock("@/context/themeContext", () => ({
  useTheme: () => ({
    theme: {
      foreground: "#111",
      secondary: "#666",
      primary: "#3BD0D2",
      border: "#ddd",
      background: "#fff",
    },
    mode: "light",
  }),
}));

jest.mock("@/context/petsContext", () => ({
  usePets: () => ({
    pets: [],
    loadingPets: false,
    addPet: jest.fn(),
  }),
}));

jest.mock("@/context/selectedPetContext", () => ({
  useSelectedPet: () => ({
    selectedPetId: null,
    setSelectedPetId: jest.fn(),
  }),
}));

const initialMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

describe("BookVetVisitScreen (no pets)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("prompts to add a pet and links to onboarding", () => {
    render(
      <SafeAreaProvider initialMetrics={initialMetrics}>
        <BookVetVisitScreen />
      </SafeAreaProvider>
    );
    expect(screen.getByText("Book a visit")).toBeTruthy();
    expect(screen.getByText(/Add a pet to your profile first/)).toBeTruthy();
    fireEvent.press(screen.getByText("Add a pet"));
    expect(mockPush).toHaveBeenCalledWith("/onboarding/step1");
  });
});
