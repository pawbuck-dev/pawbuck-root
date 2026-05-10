import { useTheme } from "@/context/themeContext";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { Platform, Text, TouchableOpacity, View } from "react-native";

type Props = {
  onOpenMilo: () => void;
};

/**
 * Primary home CTA — opens Milo chat (same premium gate as bottom nav Milo).
 */
export default function MiloHomeLeadCard({ onOpenMilo }: Props) {
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";
  const borderStyle =
    Platform.OS === "android"
      ? {}
      : {
          borderWidth: 1 as const,
          borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
        };

  return (
    <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
      <TouchableOpacity
        onPress={onOpenMilo}
        activeOpacity={0.85}
        style={{
          backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "#FFFFFF",
          borderRadius: 20,
          paddingVertical: 18,
          paddingHorizontal: 16,
          ...borderStyle,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: isDark ? "rgba(56, 189, 189, 0.2)" : "rgba(59, 208, 210, 0.18)",
              alignItems: "center",
              justifyContent: "center",
              marginRight: 12,
            }}
          >
            <Ionicons name="chatbubbles" size={24} color={theme.primary} />
          </View>
          <View style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <Text style={{ fontSize: 17, fontWeight: "700", color: theme.foreground }}>
                Something off with Milo today?
              </Text>
              <Ionicons name="sparkles" size={18} color={theme.primary} />
            </View>
            <Text style={{ fontSize: 13, color: theme.secondary, marginTop: 6, lineHeight: 19 }}>
              Quick check-in or symptom triage with Milo AI
            </Text>
          </View>
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <MaterialCommunityIcons name="arrow-top-right" size={22} color={theme.secondary} />
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
}
