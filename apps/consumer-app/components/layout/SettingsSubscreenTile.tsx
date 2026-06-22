import { useTheme } from "@/context/themeContext";
import React, { type ReactNode } from "react";
import { Text, View, type StyleProp, type ViewStyle } from "react-native";
import { getSettingsSubscreenTokens } from "./settingsSubscreenTokens";

type SettingsSubscreenTileProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Section label above the tile */
  heading?: string;
};

export function SettingsSubscreenTile({ children, style, heading }: SettingsSubscreenTileProps) {
  const { theme, mode } = useTheme();
  const t = getSettingsSubscreenTokens(theme, mode === "dark");

  return (
    <View style={{ marginBottom: 14 }}>
      {heading ? (
        <Text
          style={{
            fontFamily: "Poppins_600SemiBold",
            fontSize: 16,
            color: t.title,
            marginBottom: 12,
          }}
        >
          {heading}
        </Text>
      ) : null}
      <View
        style={[
          {
            backgroundColor: t.tileBg,
            borderRadius: t.tileRadius,
            padding: 18,
            overflow: "hidden",
            ...t.tileBorder,
          },
          style,
        ]}
      >
        {children}
      </View>
    </View>
  );
}
