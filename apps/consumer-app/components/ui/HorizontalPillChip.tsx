import { useTheme } from "@/context/themeContext";
import React, { type ReactNode } from "react";
import { Text, TouchableOpacity, View } from "react-native";

/** Shared horizontal pill used for pet selection and filter chips across the app. */
export type HorizontalPillChipProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
  leading?: ReactNode;
  /** Circular grey well behind leading — use for pet avatars; off for inline filter icons. */
  leadingWell?: boolean;
  badge?: number;
  accessibilityLabel?: string;
  accessibilityHint?: string;
};

const LEADING_SIZE = 32;

export function HorizontalPillChip({
  label,
  selected,
  onPress,
  leading,
  leadingWell = true,
  badge,
  accessibilityLabel,
  accessibilityHint,
}: HorizontalPillChipProps) {
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";

  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ selected }}
      activeOpacity={0.7}
      style={{
        flexDirection: "row",
        alignItems: "center",
        flexShrink: 0,
        alignSelf: "flex-start",
        paddingVertical: 6,
        paddingLeft: leading ? (leadingWell ? 6 : 12) : 14,
        paddingRight: 14,
        borderRadius: 100,
        backgroundColor: selected
          ? theme.primary
          : isDark
            ? "rgba(255,255,255,0.08)"
            : "#FFFFFF",
        borderWidth: selected ? 0 : 1,
        borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)",
      }}
    >
      {leading ? (
        leadingWell ? (
          <View
            style={{
              width: LEADING_SIZE,
              height: LEADING_SIZE,
              borderRadius: LEADING_SIZE / 2,
              overflow: "hidden",
              backgroundColor: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.08)",
              alignItems: "center",
              justifyContent: "center",
              marginRight: 8,
            }}
          >
            {leading}
          </View>
        ) : (
          <View
            style={{
              marginRight: 6,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {leading}
          </View>
        )
      ) : null}

      <Text
        style={{
          fontFamily: "Poppins_600SemiBold",
          fontSize: 14,
          color: selected ? "#FFFFFF" : theme.foreground,
        }}
        numberOfLines={1}
      >
        {label}
      </Text>

      {badge != null && badge > 0 ? (
        <View
          style={{
            marginLeft: 6,
            minWidth: 18,
            height: 18,
            borderRadius: 9,
            backgroundColor: selected ? "rgba(255,255,255,0.3)" : "#EF4444",
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 4,
          }}
        >
          <Text style={{ fontFamily: "Poppins_700Bold", fontSize: 10, color: "#fff" }}>
            {badge > 9 ? "9+" : badge}
          </Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

export const HORIZONTAL_PILL_ROW_GAP = 10;
export const HORIZONTAL_PILL_ROW_PADDING_H = 20;
