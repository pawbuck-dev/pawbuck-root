import type { ReactNode } from "react";
import BookVetSelectServiceScreen from "@/app/(home)/book-vet-visit/select-service";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

let mockPush: jest.Mock;
let mockBack: jest.Mock;
let mockParams: Record<string, string | undefined>;

jest.mock("@expo/vector-icons", () => ({
  MaterialCommunityIcons: () => null,
}));

jest.mock("expo-router", () => {
  mockPush = jest.fn();
  mockBack = jest.fn();
  mockParams = {};
  return {
    useRouter: () => ({ push: mockPush, back: mockBack, replace: jest.fn() }),
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

jest.mock("@/components/booking/BookingFlowHeader", () => ({
  BookingFlowHeader: () => null,
}));

jest.mock("@/components/home/BottomNavBar", () => ({
  __esModule: true,
  default: () => null,
}));

const initialMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

function renderSelectService() {
  return render(
    <SafeAreaProvider initialMetrics={initialMetrics}>
      <BookVetSelectServiceScreen />
    </SafeAreaProvider>
  );
}

describe("BookVetSelectServiceScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockParams = {};
  });

  it("shows fallback when vetId is missing", () => {
    renderSelectService();
    expect(screen.getByText(/Pick a clinic first/)).toBeTruthy();
    fireEvent.press(screen.getByText("Go back"));
    expect(mockBack).toHaveBeenCalled();
  });

  it("shows catalog and navigates to pick-datetime after selection", () => {
    mockParams = { vetId: "1", vetName: "Yaletown Pet Hospital", petId: "550e8400-e29b-41d4-a716-446655440001" };
    renderSelectService();
    expect(screen.getByText("Select Service")).toBeTruthy();
    expect(screen.getByText("Yaletown Pet Hospital")).toBeTruthy();
    fireEvent.press(screen.getByText("Wellness Exam"));
    fireEvent.press(screen.getByText("Continue"));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/book-vet-visit/pick-datetime",
      params: {
        vetId: "1",
        vetName: "Yaletown Pet Hospital",
        petId: "550e8400-e29b-41d4-a716-446655440001",
        serviceId: "wellness",
      },
    });
  });
});
