import ForgotPasswordScreen from "@/app/forgot-password";
import { requestPasswordReset } from "@/services/authPasswordReset";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

const mockReplace = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: jest.fn(),
  }),
  useLocalSearchParams: () => ({ email: "saved@test.com" }),
}));

jest.mock("@/services/authPasswordReset", () => ({
  requestPasswordReset: jest.fn(),
}));

jest.mock("@/context/themeContext", () => ({
  useTheme: () => ({
    theme: {
      foreground: "#111",
      primary: "#3BD0D2",
    },
    mode: "light",
  }),
}));

const initialMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

describe("ForgotPasswordScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (requestPasswordReset as jest.Mock).mockResolvedValue({
      message: "If an account exists for that email, we sent a password reset link.",
    });
  });

  it("prefills email from route params", () => {
    render(
      <SafeAreaProvider initialMetrics={initialMetrics}>
        <ForgotPasswordScreen />
      </SafeAreaProvider>
    );
    expect(screen.getByDisplayValue("saved@test.com")).toBeTruthy();
  });

  it("submits reset request and shows success alert", async () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});

    render(
      <SafeAreaProvider initialMetrics={initialMetrics}>
        <ForgotPasswordScreen />
      </SafeAreaProvider>
    );

    fireEvent.press(screen.getByText("Send reset link"));

    await waitFor(() => {
      expect(requestPasswordReset).toHaveBeenCalledWith("saved@test.com");
    });

    expect(alertSpy).toHaveBeenCalledWith(
      "Check your email",
      expect.stringMatching(/If an account exists/),
      expect.any(Array)
    );

    alertSpy.mockRestore();
  });
});
