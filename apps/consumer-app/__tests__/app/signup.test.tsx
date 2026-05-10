import SignUp from "@/app/signup";
import { upsertUserPreferences } from "@/services/userPreferences";
import { supabase } from "@/utils/supabase";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

let mockReplace: jest.Mock;

jest.mock("expo-router", () => {
  mockReplace = jest.fn();
  return {
    useRouter: () => ({
      replace: mockReplace,
      back: jest.fn(),
    }),
    useLocalSearchParams: () => ({}),
  };
});

jest.mock("@/utils/supabase", () => ({
  supabase: {
    auth: {
      signUp: jest.fn(),
    },
  },
}));

jest.mock("@/services/userPreferences", () => ({
  upsertUserPreferences: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/context/themeContext", () => ({
  useTheme: () => ({
    theme: {
      foreground: "#111",
      secondary: "#666",
      primary: "#3BD0D2",
      primaryForeground: "#fff",
      border: "#ddd",
      background: "#fff",
    },
    mode: "light",
  }),
}));

jest.mock("@/context/onboardingContext", () => ({
  useOnboarding: () => ({
    isOnboardingComplete: false,
    petData: null,
    resetOnboarding: jest.fn(),
  }),
}));

jest.mock("@/context/petsContext", () => ({
  usePets: () => ({ addPet: jest.fn() }),
}));

jest.mock("@/components/OAuth/OAuth", () => ({
  __esModule: true,
  default: () => null,
}));

const initialMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

function renderSignup() {
  return render(
    <SafeAreaProvider initialMetrics={initialMetrics}>
      <SignUp />
    </SafeAreaProvider>
  );
}

describe("SignUp screen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (supabase.auth.signUp as jest.Mock).mockResolvedValue({
      data: { user: { id: "new-user-1" } },
      error: null,
    });
  });

  it("shows create account copy", () => {
    renderSignup();
    expect(screen.getByText("Create Account")).toBeTruthy();
    expect(screen.getByText("Sign up to save your pet's profile")).toBeTruthy();
  });

  it("alerts when fields are empty", () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    renderSignup();
    fireEvent.press(screen.getByText("Sign Up"));
    expect(alertSpy).toHaveBeenCalledWith("Error", "Please fill in all fields");
    alertSpy.mockRestore();
  });

  it("alerts when passwords do not match", () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    renderSignup();
    fireEvent.changeText(screen.getByPlaceholderText("you@example.com"), "a@b.com");
    const pwFields = screen.getAllByPlaceholderText("••••••••");
    fireEvent.changeText(pwFields[0], "secret1");
    fireEvent.changeText(pwFields[1], "secret2");
    fireEvent.press(screen.getByText("Sign Up"));
    expect(alertSpy).toHaveBeenCalledWith("Error", "Passwords do not match");
    alertSpy.mockRestore();
  });

  it("alerts when password is too short", () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    renderSignup();
    fireEvent.changeText(screen.getByPlaceholderText("you@example.com"), "a@b.com");
    const pwFields = screen.getAllByPlaceholderText("••••••••");
    fireEvent.changeText(pwFields[0], "short");
    fireEvent.changeText(pwFields[1], "short");
    fireEvent.press(screen.getByText("Sign Up"));
    expect(alertSpy).toHaveBeenCalledWith("Error", "Password must be at least 6 characters");
    alertSpy.mockRestore();
  });

  it("calls signUp with trimmed email and navigates home on success", async () => {
    renderSignup();
    fireEvent.changeText(screen.getByPlaceholderText("you@example.com"), "  new@user.com  ");
    const pwFields = screen.getAllByPlaceholderText("••••••••");
    fireEvent.changeText(pwFields[0], "secret12");
    fireEvent.changeText(pwFields[1], "secret12");
    fireEvent.press(screen.getByText("Sign Up"));

    await waitFor(() => {
      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: "new@user.com",
        password: "secret12",
      });
    });
    await waitFor(() => {
      expect(upsertUserPreferences).toHaveBeenCalledWith("new-user-1", {});
    });
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/home");
    });
  });

  it("navigates to login when tapping Sign in", () => {
    renderSignup();
    fireEvent.press(screen.getByText("Sign in"));
    expect(mockReplace).toHaveBeenCalledWith("/login");
  });
});
