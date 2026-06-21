import { ThemeProvider, themeModeLabel } from "@/context/themeContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, renderHook } from "@testing-library/react-native";
import React from "react";
import { useTheme } from "@/context/themeContext";

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

jest.mock("react-native/Libraries/Utilities/useColorScheme", () => ({
  __esModule: true,
  default: jest.fn(() => "light"),
}));

describe("themeContext", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  });

  it("labels theme modes", () => {
    expect(themeModeLabel("light")).toBe("Light");
    expect(themeModeLabel("dark")).toBe("Dark");
    expect(themeModeLabel("system")).toBe("System default");
  });

  it("persists theme mode preference", async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ThemeProvider>{children}</ThemeProvider>
    );
    const { result } = renderHook(() => useTheme(), { wrapper });
    await act(async () => {
      result.current.setThemeMode("light");
    });
    expect(AsyncStorage.setItem).toHaveBeenCalledWith("@pawbuck/theme_mode_preference_v1", "light");
  });
});
