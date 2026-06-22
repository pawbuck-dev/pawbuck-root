import { useTheme } from "@/context/themeContext";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getSettingsSubscreenTokens } from "./settingsSubscreenTokens";

type SettingsSubscreenHeaderProps = {
  title: string;
  onBack?: () => void;
};

export function SettingsSubscreenHeader({ title, onBack }: SettingsSubscreenHeaderProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";
  const t = getSettingsSubscreenTokens(theme, isDark);

  const handleBack = onBack ?? (() => router.back());

  return (
    <View
      style={{
        paddingTop: insets.top + 8,
        paddingBottom: 16,
        paddingHorizontal: t.contentPaddingH,
        position: "relative",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Pressable
        onPress={handleBack}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        style={[
          {
            position: "absolute",
            left: t.contentPaddingH,
            width: 44,
            height: 44,
            borderRadius: 22,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: t.backFabBg,
            borderWidth: isDark ? 0 : 1,
            borderColor: isDark ? "transparent" : "#E8E8E8",
          },
          !isDark && {
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.08,
            shadowRadius: 4,
            elevation: 2,
          },
        ]}
      >
        <Ionicons name="chevron-back" size={22} color={t.title} />
      </Pressable>
      <Text
        style={{
          fontFamily: "Poppins_600SemiBold",
          fontSize: 18,
          color: t.title,
        }}
      >
        {title}
      </Text>
    </View>
  );
}
