/**
 * Label — from Figma Elements 44:408, component "label" 54:1473.
 * Title + optional Helper text.
 */
import { useTheme } from "@/context/themeContext";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

export interface LabelProps {
  title: string;
  helperText?: string;
  showHelper?: boolean;
}

export function Label({
  title,
  helperText,
  showHelper = true,
}: LabelProps) {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: theme.foreground }]}>{title}</Text>
      {showHelper && helperText ? (
        <Text style={[styles.helper, { color: theme.secondary }]}>
          {helperText}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  title: {
    fontSize: 14,
    fontWeight: "500",
  },
  helper: {
    fontSize: 12,
  },
});
