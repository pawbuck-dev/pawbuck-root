import AcceptInviteScreen from "@/app/accept-invite/index";
import { render, screen, waitFor } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

const mockReplace = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ replace: mockReplace, push: jest.fn() }),
  useLocalSearchParams: () => ({ token: "test-token" }),
}));

jest.mock("@/context/authContext", () => ({
  useAuth: jest.fn(),
}));

jest.mock("@/context/themeContext", () => ({
  useTheme: () => ({
    theme: {
      background: "#fff",
      foreground: "#111",
      secondary: "#666",
      primary: "#3BD0D2",
      primaryForeground: "#000",
    },
    mode: "light",
  }),
}));

jest.mock("@/services/petFamilyInvites", () => ({
  acceptPetFamilyInviteToken: jest.fn().mockResolvedValue({ petId: "p1", role: "contributor" }),
  resolveInviteTokenFromParams: () => "test-token",
  petFamilyInviteErrorMessage: (e: string) => e,
}));

jest.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: jest.fn() }),
}));

import { useAuth } from "@/context/authContext";
import { acceptPetFamilyInviteToken } from "@/services/petFamilyInvites";

const initialMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

describe("AcceptInviteScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows success after accepting token when authenticated", async () => {
    (useAuth as jest.Mock).mockReturnValue({
      isAuthenticated: true,
      loading: false,
    });

    render(
      <SafeAreaProvider initialMetrics={initialMetrics}>
        <AcceptInviteScreen />
      </SafeAreaProvider>
    );

    await waitFor(() => {
      expect(acceptPetFamilyInviteToken).toHaveBeenCalledWith("test-token");
    });

    expect(await screen.findByText("You're on the care team")).toBeTruthy();
  });
});
