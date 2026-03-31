import { useTheme } from "@/context/themeContext";
import { Image } from "expo-image";
import React from "react";
import { Platform, StyleSheet, Text, View } from "react-native";

const ACTION_FRAME = require("@/assets/icons/ActionRequiredFrame.svg");

export type ActionRequiredBannerProps = {
  /** Defaults to "Action Needed" */
  title?: string;
  body: string;
};

/**
 * Figma ActionRequired.svg — vector frame (tint + border + glow) with dynamic copy.
 * Original SVG bakes text as paths; we use ActionRequiredFrame.svg (no text) + RN Text.
 */
export function ActionRequiredBanner({ title = "Action Needed", body }: ActionRequiredBannerProps) {
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";

  const titleColor = theme.foreground;
  const bodyColor = isDark ? "rgba(255,255,255,0.72)" : "#727979";

  return (
    <View style={styles.root}>
      <Image source={ACTION_FRAME} style={StyleSheet.absoluteFill} contentFit="fill" />
      <View style={styles.content} pointerEvents="box-none">
        <Text style={[styles.title, { color: titleColor }]}>{title}</Text>
        <Text style={[styles.body, { color: bodyColor }]}>{body}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: "relative",
    borderRadius: 24,
    overflow: "hidden",
    minHeight: 100,
  },
  content: {
    paddingVertical: 14,
    paddingHorizontal: 14,
    zIndex: 1,
  },
  title: {
    fontFamily: "Poppins_700Bold",
    fontSize: 14,
    marginBottom: 8,
    ...(Platform.OS === "android" ? { includeFontPadding: false } : {}),
  },
  body: {
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    lineHeight: 20,
  },
});
