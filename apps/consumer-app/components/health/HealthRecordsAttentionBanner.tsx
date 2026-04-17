import { dashboardCareTeamCardChrome } from "@/constants/figmaHealthLayout";
import { useTheme } from "@/context/themeContext";
import { hexToRgba } from "@/utils/healthHubAttention";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

type HealthRecordsAttentionBannerProps = {
  subtitle: string;
  onPress?: () => void;
};

/**
 * Theme-first callout when hub attention count &gt; 0 (sketch layouts use richer chrome; we stick to theme tokens).
 */
export default function HealthRecordsAttentionBanner({ subtitle, onPress }: HealthRecordsAttentionBannerProps) {
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";

  const content = (
    <View
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 12,
        paddingVertical: 14,
        paddingHorizontal: 14,
        borderRadius: 16,
        ...dashboardCareTeamCardChrome(isDark),
        borderLeftWidth: 4,
        borderLeftColor: theme.primary,
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: isDark ? "rgba(255,255,255,0.06)" : hexToRgba(theme.primary, 0.14),
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name="alert-circle" size={22} color={theme.primary} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontSize: 16, fontWeight: "700", color: theme.foreground }}>Attention needed</Text>
        <Text style={{ fontSize: 14, color: theme.secondary, marginTop: 4, lineHeight: 20 }}>{subtitle}</Text>
      </View>
      {onPress ? (
        <Ionicons name="chevron-forward" size={20} color={theme.secondary} style={{ marginTop: 2 }} />
      ) : null}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={{ marginBottom: 14 }}>
        {content}
      </TouchableOpacity>
    );
  }

  return <View style={{ marginBottom: 14 }}>{content}</View>;
}
