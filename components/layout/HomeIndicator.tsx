import { FIGMA_HOME_INDICATOR } from "@/constants/layout";
import { useTheme } from "@/context/themeContext";
import React from "react";
import { Platform, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * Figma Mobile Elements: Home Indicator (node 29:192).
 * Specs: 28pt total height, 16pt top / 8pt bottom padding, pill 110×4pt, full rounded.
 * Light = #0D0F0F, Dark = white (use theme.foreground).
 */
export function HomeIndicator() {
  const { bottom } = useSafeAreaInsets();
  const { theme } = useTheme();

  if (bottom <= 0 || Platform.OS !== "ios") {
    return null;
  }

  const { pillWidth, pillHeight, pillBorderRadius } = FIGMA_HOME_INDICATOR;

  return (
    <View
      style={{
        paddingTop: FIGMA_HOME_INDICATOR.paddingTop,
        paddingBottom: FIGMA_HOME_INDICATOR.paddingBottom,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <View
        style={{
          width: pillWidth,
          height: pillHeight,
          borderRadius: pillBorderRadius,
          backgroundColor: theme.foreground,
        }}
      />
    </View>
  );
}
