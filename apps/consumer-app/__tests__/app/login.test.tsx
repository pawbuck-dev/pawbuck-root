import Login from "@/app/login";
import { supabase } from "@/utils/supabase";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

const mockReplace = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({
    back: jest.fn(),
    replace: mockReplace,
    dismissAll: jest.fn(),
  }),
  useLocalSearchParams: () => ({}),
}));

jest.mock("@/utils/supabase", () => ({
  supabase: {
    auth: {
      signInWithPassword: jest.fn(),
    },
  },
}));

jest.mock("@/context/themeContext", () => ({
  useTheme: () => ({
    theme: {
      foreground: "#111",
      secondary: "#666",
      primary: "#3BD0D2",
      primaryForeground: "#fff",
      border: "#ddd",
    },
    mode: "light",
  }),
}));

jest.mock("@/hooks/useCreatePetFromOnboardingDraft", () => ({
  useCreatePetFromOnboardingDraft: () => jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/components/OAuth/OAuth", () => ({
  __esModule: true,
  default: () => null,
}));

const initialMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

function renderLogin() {
  return render(
    <SafeAreaProvider initialMetrics={initialMetrics}>
      <Login />
    </SafeAreaProvider>
  );
}

describe("Login screen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({ error: null });
  });

  it("shows welcome copy", () => {
    renderLogin();
    expect(screen.getByText("Welcome Back")).toBeTruthy();
    expect(screen.getByText("Sign in to manage your pets")).toBeTruthy();
    expect(screen.getByText("Don't have an account?")).toBeTruthy();
  });

  it("navigates to signup when sign up link is pressed", () => {
    renderLogin();
    fireEvent.press(screen.getByText("Sign up"));

    expect(mockReplace).toHaveBeenCalledWith({
      pathname: "/signup",
      params: {
        returnTo: "",
        transferCode: "",
        inviteCode: "",
      },
    });
  });

  it("alerts when email or password is missing", () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    renderLogin();
    fireEvent.press(screen.getByText("Sign In"));
    expect(alertSpy).toHaveBeenCalledWith("Error", "Please enter both email and password");
    alertSpy.mockRestore();
  });

  it("calls Supabase signInWithPassword with trimmed email", async () => {
    renderLogin();
    fireEvent.changeText(screen.getByPlaceholderText("you@example.com"), "  user@test.com  ");
    fireEvent.changeText(screen.getByPlaceholderText("••••••••"), "secret12");
    fireEvent.press(screen.getByText("Sign In"));

    await waitFor(() => {
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: "user@test.com",
        password: "secret12",
      });
    });
  });
});
