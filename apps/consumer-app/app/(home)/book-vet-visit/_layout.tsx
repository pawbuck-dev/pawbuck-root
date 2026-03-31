import { useTheme } from "@/context/themeContext";
import { Stack } from "expo-router";

export default function BookVetVisitLayout() {
  const { theme } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.background },
      }}
    />
  );
}
