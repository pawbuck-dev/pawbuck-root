import { OnboardingProvider } from "@/context/onboardingContext";
import { ThemeProvider } from "@/context/themeContext";
import { Stack } from "expo-router";
import "../global.css";

export default function RootLayout() {
  return (
    <ThemeProvider>
      <OnboardingProvider>
        <Stack
          screenOptions={{
            headerShown: false,
          }}
        />
      </OnboardingProvider>
    </ThemeProvider>
  );
}
