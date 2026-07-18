import { RemindersSettingsContent } from "@/components/settings/RemindersSettingsContent";
import { useNotifications } from "@/context/notificationsContext";
import { useSubscription } from "@/context/subscriptionContext";
import { useTheme } from "@/context/themeContext";
import { useUserPreferences } from "@/context/userPreferencesContext";
import { fireEvent, render, screen } from "@testing-library/react-native";

jest.mock("@/context/userPreferencesContext", () => ({
  useUserPreferences: jest.fn(),
}));

jest.mock("@/context/notificationsContext", () => ({
  useNotifications: jest.fn(),
}));

jest.mock("@/context/subscriptionContext", () => ({
  useSubscription: jest.fn(),
}));

jest.mock("@/context/themeContext", () => ({
  useTheme: jest.fn(),
}));

jest.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: jest.fn() }),
}));

describe("RemindersSettingsContent", () => {
  const mockOpenPaywall = jest.fn();
  const mockUpdatePreferences = jest.fn().mockResolvedValue(undefined);
  const mockRefreshNotifications = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    jest.clearAllMocks();
    (useTheme as jest.Mock).mockReturnValue({
      theme: {
        foreground: "#111",
        primary: "#2BA89E",
        secondary: "#666",
      },
      mode: "light",
    });
    (useNotifications as jest.Mock).mockReturnValue({
      refreshNotifications: mockRefreshNotifications,
    });
    (useUserPreferences as jest.Mock).mockReturnValue({
      preferences: {
        user_id: "u1",
        journal_prompt_enabled: true,
        journal_prompt_hour: 20,
        document_expiry_push_enabled: true,
        vet_appointment_reminder_push_enabled: true,
      },
      updatePreferences: mockUpdatePreferences,
      updatingPreferences: false,
    });
  });

  it("shows upgrade banner and opens paywall when health alerts are locked", () => {
    (useSubscription as jest.Mock).mockReturnValue({
      canAccessFeature: (key: string) => key !== "health_alerts",
      openPaywall: mockOpenPaywall,
    });

    render(<RemindersSettingsContent />);

    expect(screen.getByText("Health alerts require Individual")).toBeTruthy();
    fireEvent.press(screen.getByText("Health alerts require Individual"));
    expect(mockOpenPaywall).toHaveBeenCalledWith({
      source: "health_alerts",
      requiredPlan: "individual",
    });
  });

  it("persists vet reminder toggle when health alerts are enabled", () => {
    (useSubscription as jest.Mock).mockReturnValue({
      canAccessFeature: () => true,
      openPaywall: mockOpenPaywall,
    });

    render(<RemindersSettingsContent />);

    // Switch order: journal prompt, insurance expiry, vet appointment, vaccine care.
    const switches = screen.getAllByRole("switch");
    const vetSwitch = switches[switches.length - 2];
    fireEvent(vetSwitch, "valueChange", false);

    expect(mockUpdatePreferences).toHaveBeenCalledWith({
      vet_appointment_reminder_push_enabled: false,
    });
    expect(mockOpenPaywall).not.toHaveBeenCalled();
  });

  it("persists vaccine care toggle without health alerts gate", () => {
    (useSubscription as jest.Mock).mockReturnValue({
      canAccessFeature: () => true,
      openPaywall: mockOpenPaywall,
    });

    render(<RemindersSettingsContent />);

    const switches = screen.getAllByRole("switch");
    const vaccineSwitch = switches[switches.length - 1];
    fireEvent(vaccineSwitch, "valueChange", false);

    expect(mockUpdatePreferences).toHaveBeenCalledWith({
      proactive_vaccine_push_enabled: false,
    });
    expect(mockOpenPaywall).not.toHaveBeenCalled();
  });
});
