import FamilySharingHubScreen from "@/app/(home)/family-sharing";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn() }),
}));

jest.mock("@/context/themeContext", () => ({
  useTheme: () => ({
    theme: {
      background: "#0a1a1a",
      foreground: "#fff",
      primary: "#3BD0D2",
      secondary: "#aaa",
      card: "#1a2a2a",
      border: "#333",
    },
    mode: "dark",
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

describe("FamilySharingHubScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("routes invitees to join-household and owners to manage access", () => {
    render(
      <SafeAreaProvider initialMetrics={initialMetrics}>
        <FamilySharingHubScreen />
      </SafeAreaProvider>
    );

    fireEvent.press(screen.getByText("I was invited"));
    expect(mockPush).toHaveBeenCalledWith("/join-household");

    fireEvent.press(screen.getByText("I manage access"));
    expect(mockPush).toHaveBeenCalledWith("/(home)/family-access");
  });
});