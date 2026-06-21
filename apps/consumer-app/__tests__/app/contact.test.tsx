import Contact from "@/app/(home)/contact";
import { CONTACT_EMAIL } from "@/constants/contact";
import { supportComposeParams } from "@/utils/messagesCompose";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn() }),
}));

jest.mock("@/context/themeContext", () => ({
  useTheme: () => ({
    theme: {
      foreground: "#111",
      secondary: "#666",
      background: "#fff",
      card: "#fff",
    },
    mode: "light",
  }),
}));

jest.mock("expo-clipboard", () => ({
  setStringAsync: jest.fn(),
}));

jest.mock("@/components/home/BottomNavBar", () => ({
  __esModule: true,
  default: () => null,
}));

const initialMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

describe("Contact screen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("Send Email navigates to messages with support compose mode", () => {
    render(
      <SafeAreaProvider initialMetrics={initialMetrics}>
        <Contact />
      </SafeAreaProvider>
    );
    fireEvent.press(screen.getByText("Send Email"));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/(home)/messages",
      params: supportComposeParams(CONTACT_EMAIL),
    });
  });
});
