import { useTheme } from "@/context/themeContext";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, View } from "react-native";

/** Visual link between Daily Notes (input) and Vet Briefing (output) on home. */
export default function HealthNotesFlowConnector() {
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";
  const lineColor = isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)";

  return (
    <View
      style={{
        paddingHorizontal: 20,
        paddingVertical: 4,
        marginBottom: 4,
        alignItems: "center",
      }}
      accessibilityLabel="Daily notes feed into your vet briefing"
    >
      <View
        style={{
          width: 2,
          height: 14,
          borderRadius: 1,
          backgroundColor: theme.primary,
          opacity: 0.45,
          marginBottom: 6,
        }}
      />
      <View style={{ flexDirection: "row", alignItems: "center", width: "100%", gap: 10 }}>
        <View style={{ flex: 1, height: 1, backgroundColor: lineColor }} />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Ionicons name="sparkles" size={14} color={theme.primary} />
          <Text style={{ fontSize: 12, fontWeight: "600", color: theme.primary }}>
            Milo builds your briefing
          </Text>
        </View>
        <View style={{ flex: 1, height: 1, backgroundColor: lineColor }} />
      </View>
      <Ionicons
        name="chevron-down"
        size={16}
        color={theme.secondary}
        style={{ marginTop: 4, opacity: 0.8 }}
      />
    </View>
  );
}
