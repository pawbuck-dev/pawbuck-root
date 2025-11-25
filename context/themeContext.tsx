// ThemeContext.js
// import {  } from "nativewind";
import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useState,
} from "react";
import { useColorScheme } from "react-native";
import { darkTheme } from "../theme/dark";
import { lightTheme } from "../theme/light";
export const ThemeContext = createContext<{
  theme: typeof lightTheme | typeof darkTheme;
  mode: "light" | "dark";
  toggleTheme: () => void;
}>({
  theme: darkTheme,
  mode: "dark",
  toggleTheme: () => {},
});

export const ThemeProvider = ({ children }: PropsWithChildren) => {
  const system = useColorScheme();
  const [mode, setMode] = useState<"light" | "dark">(
    system as "light" | "dark"
  );

  const theme = mode === "light" ? lightTheme : darkTheme;

  const toggleTheme = () =>
    setMode((prev) => (prev === "light" ? "dark" : "light"));

  useEffect(() => {
    setMode(system as "light" | "dark");
  }, [system]);
  return (
    <ThemeContext.Provider value={{ theme, mode, toggleTheme }}>
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
