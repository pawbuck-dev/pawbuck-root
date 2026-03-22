/**
 * Progress bar — from Figma Elements 44:408, component set "Progress" 210:830.
 * state 0–9 (or 0–1 as fraction). Height 12, border radius 100.
 */
import { useTheme } from "@/context/themeContext";
import React from "react";
import { StyleSheet, View } from "react-native";

export interface ProgressProps {
  /** 0 to 1 (or 0–9 for 9-step; we treat as 0–1) */
  value: number;
  max?: number;
}

export function Progress({ value, max = 1 }: ProgressProps) {
  const { theme } = useTheme();
  const pct = Math.max(0, Math.min(1, max > 0 ? value / max : 0));

  return (
    <View style={[styles.track, { backgroundColor: theme.border }]}>
      <View
        style={[
          styles.fill,
          {
            width: `${pct * 100}%`,
            backgroundColor: theme.primary,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 12,
    borderRadius: 100,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 100,
  },
});
