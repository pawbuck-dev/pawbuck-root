import { SettingsSubscreenLayout } from "@/components/layout/SettingsSubscreenLayout";
import { SettingsSubscreenRow } from "@/components/layout/SettingsSubscreenRow";
import { SettingsSubscreenTile } from "@/components/layout/SettingsSubscreenTile";
import { getSettingsSubscreenTokens } from "@/components/layout/settingsSubscreenTokens";
import { useTheme, type ThemeModePreference } from "@/context/themeContext";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { View } from "react-native";

const OPTIONS: {
  id: ThemeModePreference;
  label: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { id: "light", label: "Light", subtitle: "Always use light appearance", icon: "sunny-outline" },
  { id: "dark", label: "Dark", subtitle: "Always use dark appearance", icon: "moon-outline" },
  {
    id: "system",
    label: "System default",
    subtitle: "Match your device setting",
    icon: "phone-portrait-outline",
  },
];

export default function AppearanceSettingsScreen() {
  const { theme, mode, themeMode, setThemeMode } = useTheme();
  const isDark = mode === "dark";
  const t = getSettingsSubscreenTokens(theme, isDark);

  return (
    <SettingsSubscreenLayout title="Appearance">
      <SettingsSubscreenTile style={{ paddingVertical: 10, paddingHorizontal: 14 }}>
        {OPTIONS.map((opt, index) => {
          const selected = themeMode === opt.id;
          return (
            <View key={opt.id} style={{ width: "100%" }}>
              {index > 0 ? (
                <View
                  style={{
                    height: 1,
                    backgroundColor: t.borderSubtle,
                    marginVertical: 6,
                  }}
                />
              ) : null}
              <SettingsSubscreenRow
                compact
                ionIcon={opt.icon}
                title={opt.label}
                subtitle={opt.subtitle}
                trailing="none"
                trailingNode={
                  selected ? (
                    <Ionicons name="checkmark-circle" size={22} color={theme.primary} />
                  ) : (
                    <View style={{ width: 22, height: 22 }} />
                  )
                }
                onPress={() => setThemeMode(opt.id)}
              />
            </View>
          );
        })}
      </SettingsSubscreenTile>
    </SettingsSubscreenLayout>
  );
}
