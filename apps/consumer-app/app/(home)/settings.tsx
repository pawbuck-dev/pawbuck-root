import { useTheme } from "@/context/themeContext";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";

/**
 * Legacy route: navigation used to land on Settings for account and pet management.
 * All flows live on Profile; keep this route so old links redirect without a dead screen.
 */
export default function Settings() {
  const router = useRouter();
  const { theme, mode } = useTheme();

  useEffect(() => {
    router.replace("/(home)/profile");
  }, [router]);

  return (
    <View className="flex-1 items-center justify-center" style={{ backgroundColor: theme.background }}>
      <StatusBar style={mode === "dark" ? "light" : "dark"} />
      <ActivityIndicator size="large" color={theme.primary} />
    </View>
  );
}
