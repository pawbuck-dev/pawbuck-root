import { useTheme } from "@/context/themeContext";
import { Stack } from "expo-router";

export default function TransferPetLayout() {
  const { theme } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "none",
        contentStyle: { backgroundColor: theme.background },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="step2" />
      <Stack.Screen name="step3" />
    </Stack>
  );
}

