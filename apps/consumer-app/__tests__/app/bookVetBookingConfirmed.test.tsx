import type { ReactNode } from "react";
import BookingConfirmedScreen from "@/app/(home)/book-vet-visit/booking-confirmed";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { Alert } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

let mockReplace: jest.Mock;
let mockBack: jest.Mock;
let mockParams: Record<string, string | undefined>;

jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
}));

jest.mock("expo-linear-gradient", () => ({
  LinearGradient: ({ children }: { children: ReactNode }) => {
    const { View } = require("react-native");
    return <View>{children}</View>;
  },
}));

jest.mock("expo-router", () => {
  mockReplace = jest.fn();
  mockBack = jest.fn();
  mockParams = {};
  return {
    useRouter: () => ({ replace: mockReplace, back: mockBack, push: jest.fn() }),
    useLocalSearchParams: () => mockParams,
  };
});

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
    pets: [{ id: "pet-1", name: "Rex", photo_url: null }],
    loadingPets: false,
    addPet: jest.fn(),
  }),
}));

jest.mock("@/components/home/BottomNavBar", () => ({
  __esModule: true,
  default: () => null,
}));

const initialMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

function renderConfirmed() {
  return render(
    <SafeAreaProvider initialMetrics={initialMetrics}>
      <BookingConfirmedScreen />
    </SafeAreaProvider>
  );
}

describe("BookingConfirmedScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockParams = {};
  });

  it("shows missing-details state when required params absent", () => {
    mockParams = { vetId: "1", serviceId: "wellness" };
    renderConfirmed();
    expect(screen.getByText(/Missing appointment details/)).toBeTruthy();
    fireEvent.press(screen.getByText("Go back"));
    expect(mockBack).toHaveBeenCalled();
  });

  it("shows confirmation summary and Done returns home", () => {
    mockParams = {
      vetId: "1",
      vetName: "Yaletown Pet Hospital",
      petId: "pet-1",
      serviceId: "wellness",
      date: "2026-07-20",
      time: "10:30 AM",
      bookingRef: "REF-123",
    };
    renderConfirmed();
    expect(screen.getByText("Appointment Confirmed!")).toBeTruthy();
    expect(screen.getByText("Rex")).toBeTruthy();
    expect(screen.getByText("Yaletown Pet Hospital")).toBeTruthy();
    expect(screen.getByText("Wellness Exam")).toBeTruthy();
    fireEvent.press(screen.getByText("Done"));
    expect(mockReplace).toHaveBeenCalledWith("/(home)/home");
  });

  it("View Appointments shows coming soon and replaces home", () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    mockParams = {
      vetId: "1",
      petId: "pet-1",
      serviceId: "wellness",
      date: "2026-07-20",
      time: "10:30 AM",
    };
    renderConfirmed();
    fireEvent.press(screen.getByText("View Appointments"));
    expect(alertSpy).toHaveBeenCalledWith("Coming soon", expect.any(String));
    expect(mockReplace).toHaveBeenCalledWith("/(home)/home");
    alertSpy.mockRestore();
  });
});