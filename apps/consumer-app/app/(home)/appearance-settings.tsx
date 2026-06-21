import { useTheme } from "@/context/themeContext";
import type { ThemeModePreference } from "@/context/themeContext";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const OPTIONS: { id: ThemeModePreference; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: "light", label: "Light", icon: "sunny-outline" },
  { id: "dark", label: "Dark", icon: "moon-outline" },
  { id: "system", label: "System default", icon: "phone-portrait-outline" },
];

export default function AppearanceSettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, mode, themeMode, setThemeMode } = useTheme();
  const isDark = mode === "dark";

  return (
    <View style={{ flex: 1, backgroundColor: theme.background, paddingTop: insets.top }}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 12,
          gap: 12,
        }}
      >
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={theme.foreground} />
        </Pressable>
        <Text style={{ fontSize: 20, fontWeight: "700", color: theme.foreground, flex: 1 }}>
          Appearance
        </Text>
      </View>

      <View style={{ padding: 16, gap: 10 }}>
        {OPTIONS.map((opt) => {
          const selected = themeMode === opt.id;
          return (
            <Pressable
              key={opt.id}
              onPress={() => setThemeMode(opt.id)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                padding: 16,
                borderRadius: 16,
                backgroundColor: theme.card,
                borderWidth: selected ? 2 : 1,
                borderColor: selected ? theme.primary : theme.border,
                gap: 12,
              }}
            >
              <Ionicons name={opt.icon} size={22} color={selected ? theme.primary : theme.secondary} />
              <Text style={{ flex: 1, fontSize: 16, fontWeight: "600", color: theme.foreground }}>
                {opt.label}
              </Text>
              {selected ? <Ionicons name="checkmark-circle" size={22} color={theme.primary} /> : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
