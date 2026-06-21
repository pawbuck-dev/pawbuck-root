import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useColorScheme } from "react-native";
import { darkTheme } from "../theme/dark";
import { lightTheme } from "../theme/light";

export type ThemeModePreference = "light" | "dark" | "system";

const THEME_STORAGE_KEY = "@pawbuck/theme_mode_preference_v1";

export const ThemeContext = createContext<{
  theme: typeof lightTheme | typeof darkTheme;
  mode: "light" | "dark";
  themeMode: ThemeModePreference;
  setThemeMode: (mode: ThemeModePreference) => void;
  toggleTheme: () => void;
}>({
  theme: darkTheme,
  mode: "dark",
  themeMode: "system",
  setThemeMode: () => {},
  toggleTheme: () => {},
});

function resolveMode(preference: ThemeModePreference, systemScheme: string | null | undefined): "light" | "dark" {
  if (preference === "system") {
    return systemScheme === "light" ? "light" : "dark";
  }
  return preference;
}

export const ThemeProvider = ({ children }: PropsWithChildren) => {
  const systemScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeModePreference>("dark");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (stored === "light" || stored === "dark" || stored === "system") {
          setThemeModeState(stored);
        }
      } finally {
        setHydrated(true);
      }
    })();
  }, []);

  const setThemeMode = useCallback((next: ThemeModePreference) => {
    setThemeModeState(next);
    void AsyncStorage.setItem(THEME_STORAGE_KEY, next);
  }, []);

  const mode = useMemo(
    () => (hydrated ? resolveMode(themeMode, systemScheme) : "dark"),
    [hydrated, themeMode, systemScheme]
  );

  const theme = mode === "light" ? lightTheme : darkTheme;

  const toggleTheme = useCallback(() => {
    setThemeMode(mode === "light" ? "dark" : "light");
  }, [mode, setThemeMode]);

  return (
    <ThemeContext.Provider value={{ theme, mode, themeMode, setThemeMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

export function themeModeLabel(themeMode: ThemeModePreference): string {
  if (themeMode === "light") return "Light";
  if (themeMode === "dark") return "Dark";
  return "System default";
}
