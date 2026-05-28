import { getPawthonSurfaceTokens } from "@/components/pawthon/pawthonSurfaceTokens";
import { useTheme } from "@/context/themeContext";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, Text, View } from "react-native";

export type PawthonWalkHistoryCardProps = {
  kicker: string;
  title: string;
  subtitle?: string;
  onPress: () => void;
  /** When true, inset uses light frosted fill (sky gradient cards). */
  onGradientSurface?: boolean;
};

export function PawthonWalkHistoryCard({
  kicker,
  title,
  subtitle = "View route",
  onPress,
  onGradientSurface = true,
}: PawthonWalkHistoryCardProps) {
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";
  const surfaces = getPawthonSurfaceTokens(isDark, theme);

  const insetBg = onGradientSurface
    ? isDark
      ? "rgba(255,255,255,0.1)"
      : "rgba(255,255,255,0.72)"
    : surfaces.insetBackground;

  const kickerColor = onGradientSurface
    ? isDark
      ? "rgba(255,255,255,0.7)"
      : theme.secondary
    : theme.secondary;

  return (
    <Pressable
      onPress={onPress}
      style={{
        backgroundColor: insetBg,
        borderRadius: 14,
        padding: 12,
        flexDirection: "row",
        alignItems: "flex-start",
        marginBottom: 14,
        borderWidth: onGradientSurface ? 1 : 0,
        borderColor: onGradientSurface
          ? isDark
            ? "rgba(255,255,255,0.08)"
            : "rgba(255,255,255,0.9)"
          : "transparent",
      }}
      accessibilityRole="button"
      accessibilityLabel={`${kicker}. ${title}. ${subtitle}`}
    >
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          backgroundColor: surfaces.iconBadgeBackground,
          marginRight: 10,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name="map-outline" size={20} color={theme.primary} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          style={{
            fontSize: 11,
            fontWeight: "600",
            color: kickerColor,
            letterSpacing: 0.6,
            marginBottom: 4,
            textTransform: "uppercase",
          }}
        >
          {kicker}
        </Text>
        <Text
          style={{ fontSize: 15, fontWeight: "700", color: theme.foreground, lineHeight: 20 }}
          numberOfLines={1}
        >
          {title}
        </Text>
        <Text style={{ fontSize: 13, color: theme.primary, marginTop: 6, fontWeight: "600" }}>
          {subtitle} →
        </Text>
      </View>
    </Pressable>
  );
}
