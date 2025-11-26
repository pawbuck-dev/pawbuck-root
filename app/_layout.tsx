import { ThemeProvider } from "@/context/themeContext";
import { UserProvider } from "@/context/userContext";
import { Stack } from "expo-router";
import { useEffect } from "react";
import { LogBox } from "react-native";
import "../global.css";

export default function RootLayout() {
  useEffect(() => {
    // Suppress specific warnings if needed
    LogBox.ignoreLogs(["Require cycle:"]);
  }, []);

  return (
    <ThemeProvider>
      <UserProvider>
        <Stack
          screenOptions={{
            headerShown: false,
            animation: "none",
          }}
        />
      </UserProvider>
    </ThemeProvider>
  );
}
