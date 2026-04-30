import { handlePetDataPlaneError } from "@/utils/petAuthAlerts";
import { supabase } from "@/utils/supabase";
import { Alert } from "react-native";

jest.mock("@/utils/supabase", () => ({
  supabase: {
    auth: {
      signOut: jest.fn().mockResolvedValue({ error: null }),
    },
  },
}));

describe("handlePetDataPlaneError", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows Session expired and signs out on JWT-style failure (401 path)", () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation((title, message, buttons) => {
      const onPress = buttons?.[0]?.onPress;
      if (typeof onPress === "function") onPress();
    });

    handlePetDataPlaneError({ status: 401, message: "Unauthorized" });

    expect(alertSpy).toHaveBeenCalledWith(
      "Session expired",
      "Please sign in again to continue.",
      expect.arrayContaining([expect.objectContaining({ text: "OK" })])
    );
    expect(supabase.auth.signOut).toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it("shows Access denied for RLS / permission errors without signing out", () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});

    handlePetDataPlaneError({ code: "42501", message: "permission denied for table pets" });

    expect(alertSpy).toHaveBeenCalledWith(
      "Access denied",
      "You do not have permission to view or change this pet."
    );
    expect(supabase.auth.signOut).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });
});
