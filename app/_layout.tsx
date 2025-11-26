import { AuthProvider } from "@/context/authContext";
import { ThemeProvider } from "@/context/themeContext";
import { Stack } from "expo-router";
import "../global.css";

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Stack
          screenOptions={{
            headerShown: false,
            animation: "none",
          }}
        />
      </AuthProvider>
    </ThemeProvider>
  );
}
