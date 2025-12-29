// ThemeContext.js
// import {  } from "nativewind";
import { createContext, PropsWithChildren, useContext, useState } from "react";
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
  const [mode, setMode] = useState<"light" | "dark">("dark");

  const theme = mode === "light" ? lightTheme : darkTheme;

  const toggleTheme = () =>
    setMode((prev) => (prev === "light" ? "dark" : "light"));

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
