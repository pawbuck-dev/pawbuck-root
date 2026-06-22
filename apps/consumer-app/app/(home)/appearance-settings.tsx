import { SettingsSubscreenLayout } from "@/components/layout/SettingsSubscreenLayout";
import { SettingsSubscreenTile } from "@/components/layout/SettingsSubscreenTile";
import { getSettingsSubscreenTokens } from "@/components/layout/settingsSubscreenTokens";
import { useTheme, type ThemeModePreference } from "@/context/themeContext";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, Text, View } from "react-native";

const OPTIONS: { id: ThemeModePreference; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: "light", label: "Light", icon: "sunny-outline" },
  { id: "dark", label: "Dark", icon: "moon-outline" },
  { id: "system", label: "System default", icon: "phone-portrait-outline" },
];

export default function AppearanceSettingsScreen() {
  const { theme, mode, themeMode, setThemeMode } = useTheme();
  const isDark = mode === "dark";
  const t = getSettingsSubscreenTokens(theme, isDark);

  return (
    <SettingsSubscreenLayout title="Appearance">
      <SettingsSubscreenTile>
        {OPTIONS.map((opt, index) => {
          const selected = themeMode === opt.id;
          return (
            <Pressable
              key={opt.id}
              onPress={() => setThemeMode(opt.id)}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                padding: 14,
                borderRadius: t.rowRadius,
                backgroundColor: selected ? `${theme.primary}18` : t.nestedBg,
                borderWidth: selected ? 2 : 1,
                borderColor: selected ? theme.primary : t.borderSubtle,
                gap: 12,
                marginTop: index === 0 ? 0 : 10,
                opacity: pressed ? 0.9 : 1,
              })}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: t.iconWellBg,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons
                  name={opt.icon}
                  size={22}
                  color={selected ? theme.primary : t.iconFg}
                />
              </View>
              <Text
                style={{
                  flex: 1,
                  fontFamily: "Poppins_600SemiBold",
                  fontSize: 16,
                  color: theme.foreground,
                }}
              >
                {opt.label}
              </Text>
              {selected ? <Ionicons name="checkmark-circle" size={22} color={theme.primary} /> : null}
            </Pressable>
          );
        })}
      </SettingsSubscreenTile>
    </SettingsSubscreenLayout>
  );
}
