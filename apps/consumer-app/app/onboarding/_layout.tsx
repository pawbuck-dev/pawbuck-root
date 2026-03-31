import { useTheme } from "@/context/themeContext";
import { Stack } from "expo-router";

export default function OnboardingLayout() {
  const { theme } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
        contentStyle: { backgroundColor: theme.background },
      }}
    />
  );
}
