import Index from "@/app/index";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

const mockReplace = jest.fn();
const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: mockPush,
  }),
}));

jest.mock("@/context/authContext", () => ({
  useAuth: jest.fn(),
}));

jest.mock("@/components/layout/SplashScreen", () => ({
  __esModule: true,
  default: ({ onFinish }: { onFinish: () => void }) => {
    const { Pressable, Text } = require("react-native");
    return (
      <Pressable testID="splash-finish" onPress={onFinish}>
        <Text>Splash</Text>
      </Pressable>
    );
  },
}));

jest.mock("@/context/themeContext", () => ({
  useTheme: () => ({
    theme: {
      background: "#0a1a1a",
      foreground: "#fff",
      primary: "#3BD0D2",
    },
    mode: "dark",
  }),
}));

import { useAuth } from "@/context/authContext";

const initialMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

function renderIndex() {
  return render(
    <SafeAreaProvider initialMetrics={initialMetrics}>
      <Index />
    </SafeAreaProvider>
  );
}

describe("Index (launch)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows welcome screen with Sign Up and Sign In after splash when signed out", () => {
    (useAuth as jest.Mock).mockReturnValue({
      isAuthenticated: false,
      loading: false,
    });

    renderIndex();
    fireEvent.press(screen.getByTestId("splash-finish"));

    expect(screen.getByText("PawBuck")).toBeTruthy();
    expect(screen.getByText("Sign Up")).toBeTruthy();
    expect(screen.getByText("Sign In")).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalledWith("/login");
  });

  it("redirects to home after splash when authenticated", () => {
    (useAuth as jest.Mock).mockReturnValue({
      isAuthenticated: true,
      loading: false,
    });

    renderIndex();
    fireEvent.press(screen.getByTestId("splash-finish"));

    expect(mockReplace).toHaveBeenCalledWith("/(home)/home");
  });
});
