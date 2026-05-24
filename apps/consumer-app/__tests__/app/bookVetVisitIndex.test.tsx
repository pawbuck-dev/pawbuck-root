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

let mockSetSelectedPetId: jest.Mock;

jest.mock("@/context/onboardingContext", () => ({
  useOnboarding: () => ({
    resetOnboarding: jest.fn(),
  }),
}));

jest.mock("@/context/petsContext", () => ({
  usePets: () => ({
    pets: [{ id: "pet-1", name: "Rex", photo_url: null }],
    loadingPets: false,
    addPet: jest.fn(),
  }),
}));

jest.mock("@/context/selectedPetContext", () => {
  mockSetSelectedPetId = jest.fn();
  return {
    useSelectedPet: () => ({
      selectedPetId: "pet-1",
      setSelectedPetId: mockSetSelectedPetId,
    }),
  };
});

const initialMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

function renderBookVisit() {
  return render(
    <SafeAreaProvider initialMetrics={initialMetrics}>
      <BookVetVisitScreen />
    </SafeAreaProvider>
  );
}

describe("BookVetVisitScreen (clinic list step)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows nearby clinics heading and first demo vet", () => {
    renderBookVisit();
    expect(screen.getByText("Nearby veterinary clinics")).toBeTruthy();
    expect(screen.getByText("Yaletown Pet Hospital")).toBeTruthy();
  });

  it("navigates to select-service when Book Now is pressed", () => {
    renderBookVisit();
    const bookButtons = screen.getAllByText("Book Now");
    fireEvent.press(bookButtons[0]!);
    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/book-vet-visit/select-service",
      params: expect.objectContaining({
        vetId: "1",
        vetName: "Yaletown Pet Hospital",
        petId: "pet-1",
      }),
    });
  });
});
