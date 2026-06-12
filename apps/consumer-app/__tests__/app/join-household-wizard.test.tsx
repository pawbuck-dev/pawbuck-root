import React from "react";
import JoinHouseholdStep1 from "@/app/join-household/index";
import JoinHouseholdStep2 from "@/app/join-household/step2";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockBack = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: mockBack }),
  useLocalSearchParams: jest.fn(),
}));

jest.mock("@/context/themeContext", () => ({
  useTheme: () => ({
    theme: {
      background: "#fff",
      foreground: "#111",
      secondary: "#666",
      primary: "#3BD0D2",
      border: "#ddd",
      error: "#c00",
    },
    mode: "light",
  }),
}));

jest.mock("@/context/authContext", () => ({
  useAuth: jest.fn(),
}));

jest.mock("@/services/householdInvites", () => ({
  verifyInviteCode: jest.fn(),
  useInviteCode: jest.fn(),
}));

import { useLocalSearchParams } from "expo-router";
import { useAuth } from "@/context/authContext";
import { useInviteCode, verifyInviteCode } from "@/services/householdInvites";

const initialMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

function renderWithProviders(node: React.ReactElement) {
  return render(
    <SafeAreaProvider initialMetrics={initialMetrics}>{node}</SafeAreaProvider>
  );
}

describe("Join household wizard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({
      isAuthenticated: true,
      loading: false,
    });
  });

  describe("step 1", () => {
    it("navigates to step 2 when code verifies", async () => {
      (verifyInviteCode as jest.Mock).mockResolvedValue({
        id: "inv-1",
        code: "MTCH-2026-ABC123",
      });

      renderWithProviders(<JoinHouseholdStep1 />);
      fireEvent.changeText(
        screen.getByPlaceholderText("e.g., MTCH-2024-ABC123"),
        "mtch-2026-abc123"
      );
      fireEvent.press(screen.getByText("Verify Code"));

      await waitFor(() => {
        expect(verifyInviteCode).toHaveBeenCalledWith("MTCH-2026-ABC123");
      });
      expect(mockPush).toHaveBeenCalledWith({
        pathname: "/join-household/step2",
        params: { inviteCode: "MTCH-2026-ABC123" },
      });
    });

    it("shows error for invalid code", async () => {
      (verifyInviteCode as jest.Mock).mockResolvedValue(null);

      renderWithProviders(<JoinHouseholdStep1 />);
      fireEvent.changeText(
        screen.getByPlaceholderText("e.g., MTCH-2024-ABC123"),
        "MTCH-2026-BAD"
      );
      fireEvent.press(screen.getByText("Verify Code"));

      expect(await screen.findByText("Invalid or expired invite code")).toBeTruthy();
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  describe("step 2", () => {
    beforeEach(() => {
      (useLocalSearchParams as jest.Mock).mockReturnValue({
        inviteCode: "MTCH-2026-ABC123",
      });
    });

    it("joins household and navigates to step 3", async () => {
      (useInviteCode as jest.Mock).mockResolvedValue(undefined);

      renderWithProviders(<JoinHouseholdStep2 />);
      fireEvent.press(screen.getByText("Join Household"));

      await waitFor(() => {
        expect(useInviteCode).toHaveBeenCalledWith("MTCH-2026-ABC123");
      });
      expect(mockReplace).toHaveBeenCalledWith({
        pathname: "/join-household/step3",
        params: { inviteCode: "MTCH-2026-ABC123" },
      });
    });

    it("shows loading while auth is resolving", () => {
      (useAuth as jest.Mock).mockReturnValue({
        isAuthenticated: false,
        loading: true,
      });

      renderWithProviders(<JoinHouseholdStep2 />);
      expect(screen.queryByText("Join Household")).toBeNull();
    });
  });
});
