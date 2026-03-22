/**
 * Tag Badge — from Figma Elements 44:408, component set "Tag Badge" 1144:22858.
 * state: blue | green | orange | red. size: sm | lg.
 */
import React from "react";
import { StyleSheet, Text, View } from "react-native";

export type TagBadgeState = "blue" | "green" | "orange" | "red";
export type TagBadgeSize = "sm" | "lg";

const STATE_COLORS: Record<TagBadgeState, string> = {
  green: "#1D3D26",
  red: "#E51E22",
  orange: "#FE7701",
  blue: "#06B0FF",
};

export interface TagBadgeProps {
  label: string;
  state?: TagBadgeState;
  size?: TagBadgeSize;
}

export function TagBadge({
  label,
  state = "green",
  size = "lg",
}: TagBadgeProps) {
  const color = STATE_COLORS[state];
  const isSm = size === "sm";

  return (
    <View
      style={[
        styles.badge,
        isSm ? styles.sm : styles.lg,
        {
          backgroundColor: `${color}1A`,
          borderColor: `${color}1A`,
        },
      ]}
    >
      <Text style={[styles.text, isSm ? styles.textSm : styles.textLg, { color }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 100,
  },
  lg: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  sm: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  text: {},
  textLg: { fontSize: 14, fontWeight: "500" },
  textSm: { fontSize: 12, fontWeight: "500" },
});
