import React from "react";
import TransferPetStep1 from "@/app/transfer-pet/index";
import TransferPetStep2 from "@/app/transfer-pet/step2";
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

jest.mock("@/context/subscriptionContext", () => ({
  useSubscription: () => ({
    openPaywall: jest.fn(),
  }),
}));

jest.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: jest.fn() }),
}));

jest.mock("@/services/petTransfers", () => ({
  verifyTransferCode: jest.fn(),
  fetchPetTransferPreview: jest.fn(),
  useTransferCode: jest.fn(),
  declinePetTransfer: jest.fn(),
}));

jest.mock("@/services/petTransferNotify", () => ({
  notifyPetTransferAccepted: jest.fn(),
  notifyPetTransferDeclined: jest.fn(),
}));

jest.spyOn(require("react-native"), "Alert", "get").mockReturnValue({
  alert: jest.fn(),
});

jest.mock("@/components/common/PrivateImage", () => {
  const { View } = require("react-native");
  return function MockPrivateImage() {
    return <View testID="private-image" />;
  };
});

jest.mock("@/components/transfer/TransferCodeQrScannerModal", () => ({
  TransferCodeQrScannerModal: () => null,
}));

import { useLocalSearchParams } from "expo-router";
import { useAuth } from "@/context/authContext";
import {
  fetchPetTransferPreview,
  verifyTransferCode,
} from "@/services/petTransfers";

const initialMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

const PREVIEW = {
  pet: {
    name: "Luna",
    breed: "Mixed",
    animal_type: "dog",
    date_of_birth: "2020-01-01",
    photo_url: null,
    email_id: "luna123",
  },
  highlights: [],
  summary: {
    vaccination_count: 1,
    active_medication_count: 0,
    clinical_exam_count: 0,
    document_count: 0,
  },
};

function renderWithProviders(node: React.ReactElement) {
  return render(
    <SafeAreaProvider initialMetrics={initialMetrics}>{node}</SafeAreaProvider>
  );
}

describe("Transfer pet wizard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useLocalSearchParams as jest.Mock).mockReturnValue({});
    (useAuth as jest.Mock).mockReturnValue({
      isAuthenticated: true,
      loading: false,
      user: { id: "user-2", email: "recipient@example.com" },
    });
  });

  describe("step 1", () => {
    it("shows scan QR entry point", () => {
      renderWithProviders(<TransferPetStep1 />);
      expect(screen.getByText("Scan QR code")).toBeTruthy();
      expect(screen.getByTestId("scan-transfer-qr")).toBeTruthy();
    });

    it("navigates to step 2 when code verifies", async () => {
      (verifyTransferCode as jest.Mock).mockResolvedValue({
        id: "tr-1",
        code: "TRF-LUNA-2026-ABCD",
      });

      renderWithProviders(<TransferPetStep1 />);
      fireEvent.changeText(
        screen.getByPlaceholderText("e.g., TRF-LUNA-2024-ABC1"),
        "trf-luna-2026-abcd"
      );
      fireEvent.press(screen.getByText("Verify Code"));

      await waitFor(() => {
        expect(verifyTransferCode).toHaveBeenCalledWith("TRF-LUNA-2026-ABCD");
      });
      expect(mockPush).toHaveBeenCalledWith({
        pathname: "/transfer-pet/step2",
        params: { transferCode: "TRF-LUNA-2026-ABCD" },
      });
    });

    it("shows error for invalid code", async () => {
      (verifyTransferCode as jest.Mock).mockResolvedValue(null);

      renderWithProviders(<TransferPetStep1 />);
      fireEvent.changeText(
        screen.getByPlaceholderText("e.g., TRF-LUNA-2024-ABC1"),
        "TRF-BAD"
      );
      fireEvent.press(screen.getByText("Verify Code"));

      expect(await screen.findByText("Invalid or expired transfer code")).toBeTruthy();
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  describe("step 2", () => {
    beforeEach(() => {
      (useLocalSearchParams as jest.Mock).mockReturnValue({
        transferCode: "TRF-LUNA-2026-ABCD",
      });
      (fetchPetTransferPreview as jest.Mock).mockResolvedValue(PREVIEW);
    });

    it("loads preview and shows accept controls", async () => {
      renderWithProviders(<TransferPetStep2 />);

      await waitFor(() => {
        expect(fetchPetTransferPreview).toHaveBeenCalledWith("TRF-LUNA-2026-ABCD");
      });

      expect(await screen.findByText("Accept Transfer")).toBeTruthy();
      expect(screen.getByText("Decline")).toBeTruthy();
    });
  });
});
