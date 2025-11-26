import { ThemeProvider } from "@/context/themeContext";
import { Stack } from "expo-router";
import { useEffect } from "react";
import { LogBox } from "react-native";
import "../global.css";

export default function RootLayout() {
  useEffect(() => {
    // Suppress specific warnings if needed
    LogBox.ignoreLogs(['Require cycle:']);
  }, []);

  return (
    <ThemeProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "none",
        }}
      />
    </ThemeProvider>
  );
}
